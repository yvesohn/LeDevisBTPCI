import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { devis, factures } from "@/db/schema";
import { and, eq, asc, desc } from "drizzle-orm";
import { utilisateurDepuis, nonAuthentifie } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await utilisateurDepuis(req);
  if (!user) return nonAuthentifie();
  const proprietaire = await db.select().from(devis).where(and(eq(devis.id, Number(id)), eq(devis.entrepriseId, user.id)));
  if (!proprietaire[0]) return NextResponse.json({ error: "Devis introuvable" }, { status: 404 });


  const rows = await db.select().from(factures).where(eq(factures.devisId, Number(id))).orderBy(desc(factures.createdAt));
  return NextResponse.json({ factures: rows });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await utilisateurDepuis(req);
  if (!user) return nonAuthentifie();
  const proprietaire = await db.select().from(devis).where(and(eq(devis.id, Number(id)), eq(devis.entrepriseId, user.id)));
  if (!proprietaire[0]) return NextResponse.json({ error: "Devis introuvable" }, { status: 404 });

  const devisId = Number(id);
  const body = await req.json();
  const pct = Math.min(100, Math.max(1, Number(body.pct) || 30));

  const dRows = await db.select().from(devis).where(eq(devis.id, devisId));
  const d = dRows[0];
  if (!d) return NextResponse.json({ error: "Devis introuvable" }, { status: 404 });
  const totalTTC = d.materiauxClient && d.totalMoSeuleTTC ? d.totalMoSeuleTTC : (d.totalTTC || 0);
  if (totalTTC <= 0) return NextResponse.json({ error: "Le devis doit d'abord être chiffré (total TTC à 0)." }, { status: 400 });

  const existantes = await db.select().from(factures).where(eq(factures.devisId, devisId)).orderBy(asc(factures.id));
  const dejaFacture = existantes.filter((f) => f.statut !== "annulee").reduce((s, f) => s + f.montant, 0);
  const montant = Math.round((totalTTC * pct) / 100);
  if (dejaFacture + montant > totalTTC) {
    return NextResponse.json({
      error: `Acompte impossible : ${new Intl.NumberFormat("fr-FR").format(dejaFacture + montant)} FCFA dépasserait le total du devis (${new Intl.NumberFormat("fr-FR").format(totalTTC)} FCFA). Solde encore facturable : ${new Intl.NumberFormat("fr-FR").format(totalTTC - dejaFacture)} FCFA.`,
    }, { status: 400 });
  }

  const annee = new Date().getFullYear();
  const numero = `FA-${annee}-${String(existantes.length + 1).padStart(2, "0")}-${String(devisId).padStart(3, "0")}`;
  const [facture] = await db.insert(factures).values({
    devisId, numero, type: "acompte", pct,
    totalDevisTTC: totalTTC, montant,
    dejaFacture: dejaFacture + montant,
    soldeRestant: totalTTC - (dejaFacture + montant),
    statut: "emise",
  }).returning();

  const toutes = await db.select().from(factures).where(eq(factures.devisId, devisId)).orderBy(desc(factures.createdAt));
  return NextResponse.json({ facture, factures: toutes, devis: d });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await utilisateurDepuis(req);
  if (!user) return nonAuthentifie();
  const proprietaire = await db.select().from(devis).where(and(eq(devis.id, Number(id)), eq(devis.entrepriseId, user.id)));
  if (!proprietaire[0]) return NextResponse.json({ error: "Devis introuvable" }, { status: 404 });

  const body = await req.json();
  const factureId = Number(body.factureId);
  if (!factureId || !["emise", "payee", "annulee"].includes(body.statut)) {
    return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
  }
  const [updated] = await db.update(factures).set({ statut: body.statut }).where(eq(factures.id, factureId)).returning();
  const toutes = await db.select().from(factures).where(eq(factures.devisId, Number(id))).orderBy(desc(factures.createdAt));
  return NextResponse.json({ facture: updated, factures: toutes });
}
