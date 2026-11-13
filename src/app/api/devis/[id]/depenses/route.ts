import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { devis, depenses } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { utilisateurDepuis, nonAuthentifie } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function resume(devisId: number) {
  const dRows = await db.select().from(devis).where(eq(devis.id, devisId));
  const d = dRows[0];
  if (!d) return null;
  const rows = await db.select().from(depenses).where(eq(depenses.devisId, devisId)).orderBy(desc(depenses.createdAt));
  const totalDepenses = rows.reduce((s, x) => s + (x.montant || 0), 0);
  // Marge nette restante = montant client HT du devis initial - dépenses réelles engagées.
  const margeNetteRestante = (d.totalHT || 0) - totalDepenses;
  const budgetRevient = (d.totalMateriauxBase || 0) + Math.round(((d.totalMateriauxBase || 0) * (d.mainOeuvrePct || 0)) / 100);
  return {
    devis: d,
    depenses: rows,
    totaux: {
      totalDepenses,
      totalDevisHT: d.totalHT || 0,
      totalDevisTTC: d.totalTTC || 0,
      margeNetteRestante,
      pctDepense: d.totalHT ? Math.min(999, Math.round((totalDepenses / d.totalHT) * 1000) / 10) : 0,
      budgetRevientEstime: d.totalMateriauxBase ? budgetRevient : null,
      ecartBudget: d.totalMateriauxBase ? totalDepenses - budgetRevient : null,
    },
  };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await utilisateurDepuis(req);
  if (!user) return nonAuthentifie();
  const proprietaire = await db.select().from(devis).where(and(eq(devis.id, Number(id)), eq(devis.entrepriseId, user.id)));
  if (!proprietaire[0]) return NextResponse.json({ error: "Devis introuvable" }, { status: 404 });


  const r = await resume(Number(id));
  if (!r) return NextResponse.json({ error: "Devis introuvable" }, { status: 404 });
  return NextResponse.json(r);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await utilisateurDepuis(req);
  if (!user) return nonAuthentifie();
  const proprietaire = await db.select().from(devis).where(and(eq(devis.id, Number(id)), eq(devis.entrepriseId, user.id)));
  if (!proprietaire[0]) return NextResponse.json({ error: "Devis introuvable" }, { status: 404 });

  const devisId = Number(id);
  const body = await req.json();
  const libelle = String(body.libelle || "").trim();
  const montant = Math.round(Number(body.montant) || 0);
  if (libelle.length < 2) return NextResponse.json({ error: "Indiquez le libellé de l'achat (ex : 40 sacs de ciment)." }, { status: 400 });
  if (montant <= 0) return NextResponse.json({ error: "Indiquez un montant en FCFA supérieur à 0." }, { status: 400 });
  const dRows = await db.select().from(devis).where(eq(devis.id, devisId));
  if (!dRows[0]) return NextResponse.json({ error: "Devis introuvable" }, { status: 404 });
  const [depense] = await db.insert(depenses).values({
    devisId, libelle, montant,
    dateDepense: String(body.dateDepense || new Date().toISOString().slice(0, 10)),
  }).returning();
  return NextResponse.json({ depense, ...(await resume(devisId)) });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await utilisateurDepuis(req);
  if (!user) return nonAuthentifie();
  const proprietaire = await db.select().from(devis).where(and(eq(devis.id, Number(id)), eq(devis.entrepriseId, user.id)));
  if (!proprietaire[0]) return NextResponse.json({ error: "Devis introuvable" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const depenseId = Number(body.depenseId);
  if (!depenseId) return NextResponse.json({ error: "depenseId manquant" }, { status: 400 });
  await db.delete(depenses).where(eq(depenses.id, depenseId));
  return NextResponse.json({ ok: true, ...(await resume(Number(id))) });
}
