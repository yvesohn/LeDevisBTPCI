import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { activations, entreprises } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { isAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

async function lister() {
  const rows = await db.select().from(activations).orderBy(desc(activations.createdAt)).limit(100);
  const out = [];
  for (const a of rows) {
    const ent = (await db.select().from(entreprises).where(eq(entreprises.id, a.entrepriseId)))[0];
    out.push({ ...a, entrepriseNom: ent?.nom || "", entrepriseEmail: ent?.email || a.email || "", entreprisePlan: ent?.plan || "", entrepriseCredits: ent?.credits ?? 0 });
  }
  return out;
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  return NextResponse.json({ activations: await lister() });
}

/** Contrôle a posteriori : valider (définitif) ou rejeter (annule les crédits débloqués). */
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const body = await req.json();
  const id = Number(body.activationId);
  const decision = String(body.decision || "");
  const rows = await db.select().from(activations).where(eq(activations.id, id));
  const act = rows[0];
  if (!act) return NextResponse.json({ error: "Activation introuvable" }, { status: 404 });
  if (act.statut !== "active") return NextResponse.json({ error: "Cette activation a déjà été traitée." }, { status: 400 });

  if (decision === "valider") {
    const [maj] = await db.update(activations).set({ statut: "validee", decidedAt: new Date() }).where(eq(activations.id, id)).returning();
    return NextResponse.json({ ok: true, message: `Paiement ${act.moyen} ${act.transactionId} validé pour ${act.email}. Crédits confirmés.`, activation: maj, activations: await lister() });
  }

  if (decision === "rejeter") {
    // Annulation du déblocage immédiat : restauration du solde et de l'offre d'avant l'activation.
    const ent = (await db.select().from(entreprises).where(eq(entreprises.id, act.entrepriseId)))[0];
    if (ent) {
      await db.update(entreprises).set({
        credits: act.creditsAvant,
        plan: act.planAvant || "gratuit",
        ...(act.offre === "illimite" ? { illimiteExpireAt: null } : {}),
      }).where(eq(entreprises.id, ent.id));
    }
    const [maj] = await db.update(activations).set({ statut: "rejetee", decidedAt: new Date() }).where(eq(activations.id, id)).returning();
    return NextResponse.json({ ok: true, message: `Activation rejetée : les crédits débloqués pour ${act.email} ont été annulés (référence ${act.transactionId}).`, activation: maj, activations: await lister() });
  }

  return NextResponse.json({ error: "Décision inconnue (valider ou rejeter)." }, { status: 400 });
}
