import "server-only";
import { cookies, headers } from "next/headers";
import { randomBytes, scryptSync, timingSafeEqual, createHmac, createHash } from "crypto";
import { db } from "@/db";
import { entreprises, sessions } from "@/db/schema";
import { eq, and, gt, lt } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export const SESSION_COOKIE = "dbtp_session";
export const TOKEN_COOKIE = "dbtp_token"; // cookie lisible en JS (secours si le cookie httpOnly est bloqué)
const SESSION_DAYS = 30;
const SECRET = process.env.AUTH_SECRET || "devisbtp-ci-auth-signature-v1-2026";

export type Compte = typeof entreprises.$inferSelect;

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string | null) {
  if (!stored || !stored.includes(":")) return false;
  const [salt, hash] = stored.split(":");
  try {
    const test = scryptSync(password, salt, 64);
    const expected = Buffer.from(hash, "hex");
    return test.length === expected.length && timingSafeEqual(test, expected);
  } catch {
    return false;
  }
}

export function emailValide(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

export async function creerSession(entrepriseId: number, passwordHash?: string | null) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 3600 * 1000);
  await db.insert(sessions).values({ token, entrepriseId, expiresAt });
  // Nettoyage opportuniste des sessions expirées.
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date())).catch(() => undefined);
  const jar = await cookies();
  // Cookie lisible en JS : permet au navigateur de renvoyer le jeton même si le cookie httpOnly est bloqué (iframe).
  const opt = await optionsCookie(SESSION_DAYS * 24 * 3600);
  jar.set(TOKEN_COOKIE, token, { ...opt, httpOnly: false });
  jar.set(SESSION_COOKIE, token, opt);
  // Jeton signé renvoyé au client : il porte l'identité et reste valable sans cookie.
  return signerJeton(entrepriseId, passwordHash);
}

/** Options de cookie adaptées au contexte : en HTTPS, SameSite=None permet l'usage dans un cadre (aperçu).
 *  En HTTP local, SameSite=Lax (obligatoire, car None exige Secure). */
async function optionsCookie(maxAge: number) {
  const https = await estHttps();
  return {
    httpOnly: true,
    sameSite: (https ? "none" : "lax") as "none" | "lax",
    secure: https,
    path: "/",
    maxAge,
    ...(https ? { partitioned: true as const } : {}),
  };
}

/** Le cookie n'est marqué Secure que si la requête arrive réellement en HTTPS. */
async function estHttps() {
  try {
    const h = await headers();
    const proto = (h.get("x-forwarded-proto") || "").split(",")[0].trim().toLowerCase();
    return proto === "https";
  } catch {
    return process.env.NODE_ENV === "production";
  }
}

export async function detruireSession() {
  const jar = await cookies();
  const token = (await jetonCourant()) || undefined;
  if (token) await db.delete(sessions).where(eq(sessions.token, token));
  const opt = await optionsCookie(0);
  jar.set(SESSION_COOKIE, "", opt);
  jar.set(TOKEN_COOKIE, "", { ...opt, httpOnly: false });
}

/** Jeton de session, lu d'abord dans le cookie puis dans l'en-tête Authorization (secours si cookies bloqués). */
/**
 * Recherche du jeton sur TOUS les canaux, dans l'ordre :
 * cookies → en-têtes → paramètre d'URL.
 * Indispensable quand un proxy (aperçu plateforme) filtre cookies et en-têtes.
 */
export async function jetonCourant() {
  const jar = await cookies();
  const duCookie = jar.get(SESSION_COOKIE)?.value || jar.get(TOKEN_COOKIE)?.value;
  if (duCookie) return duCookie;
  try {
    const h = await headers();
    const auth = h.get("authorization") || "";
    if (auth.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
    const entete = h.get("x-session-token") || h.get("x-dbtp-token");
    if (entete) return entete.trim();
  } catch { /* hors requête */ }
  return null;
}

/** Jeton transmis par l'URL (?dbtp_token=…) : dernier canal utilisable derrière un proxy filtrant. */
export function jetonDepuisUrl(req: NextRequest): string | null {
  const q = req.nextUrl.searchParams;
  return q.get("dbtp_token") || q.get("token") || q.get("sessionToken") || null;
}

/** Jeton transmis dans le corps JSON (champ sessionToken). */
export function jetonDepuisCorps(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const v = (body as Record<string, unknown>).sessionToken ?? (body as Record<string, unknown>).dbtp_token;
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

/**
 * Résolution universelle de l'utilisateur connecté :
 * cookie / en-tête / URL / corps — le premier canal valide gagne.
 */
export async function utilisateurDepuis(req: NextRequest, body?: unknown): Promise<Compte | null> {
  const viaCanal = await utilisateurCourant();
  if (viaCanal) return viaCanal;
  const jeton = jetonDepuisCorps(body) || jetonDepuisUrl(req);
  if (!jeton) return null;
  return utilisateurParJeton(jeton);
}

/** Utilisateur connecté (ou null). Chaque visiteur possède son propre compte et ses propres devis. */
export async function utilisateurCourant(): Promise<Compte | null> {
  const token = await jetonCourant();
  if (!token) return null;
  // Session en base, sinon jeton signé (chemin de secours indépendant des cookies).
  return utilisateurParJeton(token);
}

export function estFondateur(c: { role?: string | null } | null | undefined) {
  return !!c && (c.role === "fondateur" || c.role === "admin");
}

export function nonAuthentifie() {
  return NextResponse.json({ error: "Connexion requise. Veuillez vous connecter à votre compte.", code: "AUTH" }, { status: 401 });
}

/** Données publiques du compte (jamais le hash de mot de passe). */
export function comptePublic(c: Compte) {
  const { passwordHash: _ignore, ...rest } = c;
  return rest;
}

/* =====================================================================
   Jeton signé « sans état » : chemin d'authentification alternatif.
   Fonctionne même si les cookies sont bloqués et même si la table
   sessions a été vidée (redéploiement, nettoyage). La signature empêche
   toute falsification ; le hash du mot de passe invalide le jeton si
   le mot de passe est changé.
   ===================================================================== */
function empreinteMotDePasse(hash: string | null | undefined) {
  return createHash("sha256").update(String(hash || "")).digest("hex").slice(0, 16);
}

export function signerJeton(entrepriseId: number, passwordHash: string | null | undefined, jours = SESSION_DAYS) {
  const payload = { v: 1, e: entrepriseId, x: Date.now() + jours * 24 * 3600 * 1000, h: empreinteMotDePasse(passwordHash) };
  const corps = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", SECRET).update(corps).digest("base64url");
  return `${corps}.${signature}`;
}

export function lireJetonSigne(token: string): { e: number; h: string } | null {
  if (!token || !token.includes(".")) return null;
  const [corps, signature] = token.split(".");
  if (!corps || !signature) return null;
  const attendu = createHmac("sha256", SECRET).update(corps).digest("base64url");
  if (attendu.length !== signature.length || !timingSafeEqual(Buffer.from(attendu), Buffer.from(signature))) return null;
  try {
    const p = JSON.parse(Buffer.from(corps, "base64url").toString("utf8"));
    if (!p?.e || !p?.x || Date.now() > Number(p.x)) return null;
    return { e: Number(p.e), h: String(p.h || "") };
  } catch {
    return null;
  }
}

/** Retrouve un compte à partir d'un jeton quelconque : session en base, puis jeton signé. */
export async function utilisateurParJeton(token: string | null | undefined): Promise<Compte | null> {
  const valeur = String(token || "").trim();
  if (!valeur) return null;

  const parSession = await db
    .select()
    .from(sessions)
    .innerJoin(entreprises, eq(sessions.entrepriseId, entreprises.id))
    .where(and(eq(sessions.token, valeur), gt(sessions.expiresAt, new Date())))
    .limit(1);
  const viaSession = parSession[0]?.entreprises ?? null;
  if (viaSession && !viaSession.bloque) return viaSession;

  const signe = lireJetonSigne(valeur);
  if (!signe) return null;
  const rows = await db.select().from(entreprises).where(eq(entreprises.id, signe.e)).limit(1);
  const compte = rows[0];
  if (!compte || compte.bloque) return null;
  if (signe.h !== empreinteMotDePasse(compte.passwordHash)) return null;
  return compte;
}
