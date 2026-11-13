import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { entreprises } from "@/db/schema";
import { eq } from "drizzle-orm";
import { isAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const body = await req.json();
  const id = Number(body.entrepriseId);
  const action = String(body.action || "");
  const rows = await db.select().from(entreprises).where(eq(entreprises.id, id));
  const ent = rows[0];
  if (!ent) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

  let data: Partial<typeof entreprises.$inferInsert> = {};
  let message = "";
  if (action === "unique") {
    // Les comptes illimités (fondateur/admin) restent plafonnés : on ne cumule pas des crédits fictifs.
    const illimite = ent.plan === "illimite";
    data = illimite
      ? { credits: 9999, plan: "illimite" }
      : { credits: Math.min(9999, (ent.credits || 0) + 1), ...(ent.plan === "gratuit" ? { plan: "unique" } : {}) };
    message = illimite
      ? `${ent.email} dispose déjà d'un accès illimité : aucun crédit supplémentaire nécessaire.`
      : `+1 crédit Devis Unique ajouté à ${ent.email}. Nouveau solde : ${data.credits} crédit(s).`;
  } else if (action === "pack5") {
    data = { credits: Math.min(9999, (ent.credits || 0) + 5), plan: ent.plan === "illimite" ? "illimite" : "pack5" };
    message = `Pack Pro activé pour ${ent.email} : 5 crédits devis ajoutés.`;
  } else if (action === "illimite") {
    const expire = new Date(Date.now() + 30 * 24 * 3600 * 1000);
    data = { credits: 9999, plan: "illimite", illimiteExpireAt: expire };
    message = `Accès Illimité + IA activé pour ${ent.email} jusqu'au ${expire.toLocaleDateString("fr-FR")} (30 jours).`;
  } else if (action === "fondateur") {
    data = { credits: 9999, plan: "illimite", illimiteExpireAt: null };
    message = `Accès fondateur COMPLET et ILLIMITÉ (permanent) activé pour ${ent.email}.`;
  } else {
    return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
  }

  const [updated] = await db.update(entreprises).set(data).where(eq(entreprises.id, id)).returning();
  return NextResponse.json({ ok: true, message, user: updated });
}
