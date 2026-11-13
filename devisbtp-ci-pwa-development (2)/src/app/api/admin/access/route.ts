import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { entreprises, sessions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { isAdmin, niveauAcces } from "@/lib/admin";
import { hashPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

const ROLES = ["fondateur", "collaborateur", "admin", "client"];

/** Contrôle des accès par le fondateur / l'administrateur : rôle, suspension, mot de passe, suppression. */
export async function POST(req: NextRequest) {
  const cle = req.headers.get("x-admin-key") || req.headers.get("x-admin-pin");
  const niveau = niveauAcces(cle);
  if (!niveau) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const id = Number(body.entrepriseId);
  const action = String(body.action || "");
  const rows = await db.select().from(entreprises).where(eq(entreprises.id, id));
  const ent = rows[0];
  if (!ent) return NextResponse.json({ error: "Compte introuvable" }, { status: 404 });

  // Seul le niveau fondateur peut nommer/révoquer des fondateurs et des administrateurs.
  const roleDemande = String(body.role || "");
  if (action === "role") {
    if (!ROLES.includes(roleDemande)) return NextResponse.json({ error: "Rôle inconnu." }, { status: 400 });
    if ((roleDemande === "fondateur" || roleDemande === "admin" || ent.role === "fondateur") && niveau !== "fondateur") {
      return NextResponse.json({ error: "Seul le fondateur peut attribuer ou modifier un accès fondateur / administrateur." }, { status: 403 });
    }
  }

  if (action === "role") {
    const [maj] = await db.update(entreprises).set({ role: roleDemande }).where(eq(entreprises.id, id)).returning();
    const libelle = roleDemande === "fondateur" ? "Fondateur (accès complet permanent)" : roleDemande === "collaborateur" ? "Collaborateur" : roleDemande === "admin" ? "Administrateur" : "Client";
    return NextResponse.json({ ok: true, message: `${ent.email} a maintenant le rôle : ${libelle}.`, user: maj });
  }

  // Un compte fondateur, ou disposant d'un accès illimité permanent, est protégé contre la suspension et la suppression.
  const protege = ent.role === "fondateur" || ent.role === "admin" || (ent.plan === "illimite" && !ent.illimiteExpireAt);

  if (action === "suspendre") {
    if (protege && niveau !== "fondateur") {
      return NextResponse.json({ error: "Compte fondateur / administrateur protégé : seul le fondateur peut agir sur ce compte." }, { status: 403 });
    }
    if (protege && ent.role === "fondateur") {
      return NextResponse.json({ error: "Un compte fondateur ne peut pas être suspendu." }, { status: 403 });
    }
    const [maj] = await db.update(entreprises).set({ bloque: true }).where(eq(entreprises.id, id)).returning();
    await db.delete(sessions).where(eq(sessions.entrepriseId, id));
    return NextResponse.json({ ok: true, message: `Accès suspendu pour ${ent.email}. Ses sessions actives ont été fermées.`, user: maj });
  }

  if (action === "reactiver") {
    const [maj] = await db.update(entreprises).set({ bloque: false }).where(eq(entreprises.id, id)).returning();
    return NextResponse.json({ ok: true, message: `Accès réactivé pour ${ent.email}.`, user: maj });
  }

  if (action === "mot_de_passe") {
    const nouveau = String(body.password || "");
    if (nouveau.length < 8) return NextResponse.json({ error: "Le nouveau mot de passe doit contenir au moins 8 caractères." }, { status: 400 });
    await db.update(entreprises).set({ passwordHash: hashPassword(nouveau) }).where(eq(entreprises.id, id));
    await db.delete(sessions).where(eq(sessions.entrepriseId, id));
    return NextResponse.json({ ok: true, message: `Nouveau mot de passe défini pour ${ent.email}. Communiquez-le à l'utilisateur par un canal privé ; ses anciennes sessions sont fermées.` });
  }

  if (action === "supprimer") {
    if (protege) return NextResponse.json({ error: "Compte fondateur / administrateur protégé : il ne peut pas être supprimé." }, { status: 403 });
    await db.delete(sessions).where(eq(sessions.entrepriseId, id));
    await db.update(entreprises).set({ bloque: true, credits: 0, plan: "gratuit", email: `supprime-${ent.id}-${ent.email}` }).where(eq(entreprises.id, id));
    return NextResponse.json({ ok: true, message: `Compte ${ent.email} neutralisé (accès révoqué, e-mail libéré). Les devis restent conservés pour l'historique.` });
  }

  return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
}
