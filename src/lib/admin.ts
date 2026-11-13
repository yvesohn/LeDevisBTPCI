import { NextRequest } from "next/server";

/**
 * Accès à l'espace d'administration DevisBTP CI (surchargables par variables d'environnement) :
 * - ADMIN_PIN : code PIN administrateur.
 * - FOUNDER_CODE : code fondateur/collaborateur — ouvre aussi /admin avec le niveau « fondateur »
 *   et donne un accès complet et illimité à l'application.
 */
export const ADMIN_PIN = process.env.ADMIN_PIN || "092393";
export const FOUNDER_CODE = process.env.FOUNDER_CODE || "09239302";
export const ADMIN_WHATSAPP = process.env.ADMIN_WHATSAPP || "225070921922";

export type NiveauAdmin = "admin" | "fondateur";

/** Valide une clé d'administration (PIN ou code fondateur) et renvoie le niveau associé. */
export function niveauAcces(cle: string | null | undefined): NiveauAdmin | null {
  const valeur = String(cle || "").trim();
  if (!valeur) return null;
  if (valeur === ADMIN_PIN) return "admin";
  if (valeur.toUpperCase() === FOUNDER_CODE.toUpperCase()) return "fondateur";
  return null;
}

export function isAdmin(req: NextRequest) {
  return niveauAcces(req.headers.get("x-admin-key") || req.headers.get("x-admin-pin")) !== null;
}

export function illimiteActif(ent: { plan: string; illimiteExpireAt?: Date | string | null }) {
  if (ent.plan !== "illimite") return false;
  if (!ent.illimiteExpireAt) return true; // accès permanent (fondateur)
  return new Date(ent.illimiteExpireAt).getTime() > Date.now();
}
