import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { entreprises, paiements } from "@/db/schema";
import { eq } from "drizzle-orm";
import { utilisateurDepuis, nonAuthentifie, comptePublic } from "@/lib/auth";

export const dynamic = "force-dynamic";

const OFFRES: Record<string, { montant: number; credits: number; plan: string; label: string }> = {
  unique: { montant: 4900, credits: 1, plan: "unique", label: "Devis Unique — 1 devis" },
  pack5: { montant: 9900, credits: 5, plan: "pack5", label: "Pack Pro — 5 devis / mois" },
  illimite: { montant: 24900, credits: 9999, plan: "illimite", label: "Illimité + Analyse plan photo" },
};

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { offre, moyen, telephone } = body;
  const cfg = OFFRES[offre];
  if (!cfg) return NextResponse.json({ error: "Offre inconnue" }, { status: 400 });
  if (!telephone || String(telephone).replace(/\s/g, "").length < 8) {
    return NextResponse.json({ error: "Numéro Mobile Money invalide (ex : 07 07 12 34 56)." }, { status: 400 });
  }
  const ent = await utilisateurDepuis(req);
  if (!ent) return nonAuthentifie();
  const ref = `${moyen === "Wave" ? "WV" : "OM"}-${Date.now().toString().slice(-8)}`;
  await db.insert(paiements).values({ offre, montant: cfg.montant, moyen: moyen || "Wave", telephone, creditsAjoutes: cfg.credits, statut: "reussi", reference: ref });
  const newCredits = cfg.plan === "illimite" ? 9999 : (ent.credits || 0) + cfg.credits;
  const [updated] = await db.update(entreprises).set({ credits: newCredits, plan: cfg.plan }).where(eq(entreprises.id, ent.id)).returning();
  return NextResponse.json({ ok: true, reference: ref, entreprise: comptePublic(updated), message: `Paiement ${moyen} confirmé. ${cfg.plan === "illimite" ? "Offre Illimitée activée !" : `+${cfg.credits} crédit(s) ajouté(s).`}` });
}

export async function GET(req: NextRequest) {
  const rows = await db.select().from(paiements).orderBy(paiements.id);
  return NextResponse.json({ paiements: rows.slice(-10).reverse() });
}
