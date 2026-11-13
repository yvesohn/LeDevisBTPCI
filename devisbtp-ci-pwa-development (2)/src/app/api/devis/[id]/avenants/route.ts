import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { devis, avenants, avenantLignes } from "@/db/schema";
import { and, eq, asc, desc } from "drizzle-orm";
import { utilisateurDepuis, nonAuthentifie } from "@/lib/auth";

export const dynamic = "force-dynamic";

function totaux(lignes: { quantite: number; prixUnitaire: number }[], tvaPct: number) {
  const totalHT = Math.round(lignes.reduce((s, l) => s + (Number(l.quantite) || 0) * (Number(l.prixUnitaire) || 0), 0));
  const tva = Math.round((totalHT * tvaPct) / 100);
  return { totalHT, totalTTC: totalHT + tva };
}

async function lister(devisId: number) {
  const avs = await db.select().from(avenants).where(eq(avenants.devisId, devisId)).orderBy(asc(avenants.createdAt));
  const out = [];
  for (const a of avs) {
    const lignes = await db.select().from(avenantLignes).where(eq(avenantLignes.avenantId, a.id)).orderBy(asc(avenantLignes.ordre));
    out.push({ ...a, lignes });
  }
  return out;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await utilisateurDepuis(req);
  if (!user) return nonAuthentifie();
  const proprietaire = await db.select().from(devis).where(and(eq(devis.id, Number(id)), eq(devis.entrepriseId, user.id)));
  if (!proprietaire[0]) return NextResponse.json({ error: "Devis introuvable" }, { status: 404 });


  return NextResponse.json({ avenants: await lister(Number(id)) });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await utilisateurDepuis(req);
  if (!user) return nonAuthentifie();
  const proprietaire = await db.select().from(devis).where(and(eq(devis.id, Number(id)), eq(devis.entrepriseId, user.id)));
  if (!proprietaire[0]) return NextResponse.json({ error: "Devis introuvable" }, { status: 404 });

  const devisId = Number(id);
  const body = await req.json();
  const dRows = await db.select().from(devis).where(eq(devis.id, devisId));
  if (!dRows[0]) return NextResponse.json({ error: "Devis d'origine introuvable" }, { status: 404 });
  const lignesIn = Array.isArray(body.lignes) ? body.lignes : [];
  if (!lignesIn.length) return NextResponse.json({ error: "Ajoutez au moins une ligne de travaux supplémentaires." }, { status: 400 });

  const existants = await db.select().from(avenants).where(eq(avenants.devisId, devisId));
  const numero = `AV-${String(existants.length + 1).padStart(2, "0")} AU ${dRows[0].numero}`;
  const tvaPct = Number(body.tvaPct ?? dRows[0].tvaPct ?? 18);
  const lignes: { designation: string; detail: string; unite: string; quantite: number; prixUnitaire: number }[] = lignesIn.map((l: any) => ({
    designation: String(l.designation || "Travaux supplémentaires"), detail: String(l.detail || ""),
    unite: String(l.unite || "u"), quantite: Number(l.quantite) || 0, prixUnitaire: Math.round(Number(l.prixUnitaire) || 0),
  }));
  const tot = totaux(lignes, tvaPct);
  const [avenant] = await db.insert(avenants).values({
    devisId, numero,
    titre: String(body.titre || "Travaux supplémentaires"),
    description: String(body.description || ""),
    statut: ["brouillon", "envoye", "signe"].includes(body.statut) ? body.statut : "brouillon",
    tvaPct, totalHT: tot.totalHT, totalTTC: tot.totalTTC,
  }).returning();
  await db.insert(avenantLignes).values(lignes.map((l, i) => ({ avenantId: avenant.id, ...l, ordre: i })));
  return NextResponse.json({ avenant: { ...avenant, lignes: await db.select().from(avenantLignes).where(eq(avenantLignes.avenantId, avenant.id)).orderBy(asc(avenantLignes.ordre)) }, avenants: await lister(devisId), devis: dRows[0] });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await utilisateurDepuis(req);
  if (!user) return nonAuthentifie();
  const proprietaire = await db.select().from(devis).where(and(eq(devis.id, Number(id)), eq(devis.entrepriseId, user.id)));
  if (!proprietaire[0]) return NextResponse.json({ error: "Devis introuvable" }, { status: 404 });

  const devisId = Number(id);
  const body = await req.json();
  const avenantId = Number(body.avenantId);
  if (!avenantId) return NextResponse.json({ error: "avenantId manquant" }, { status: 400 });
  const tvaPct = Number(body.tvaPct ?? 18);
  const lignes: { designation: string; detail: string; unite: string; quantite: number; prixUnitaire: number }[] = (Array.isArray(body.lignes) ? body.lignes : []).map((l: any) => ({
    designation: String(l.designation || "Travaux supplémentaires"), detail: String(l.detail || ""),
    unite: String(l.unite || "u"), quantite: Number(l.quantite) || 0, prixUnitaire: Math.round(Number(l.prixUnitaire) || 0),
  }));
  const tot = totaux(lignes, tvaPct);
  await db.delete(avenantLignes).where(eq(avenantLignes.avenantId, avenantId));
  if (lignes.length) await db.insert(avenantLignes).values(lignes.map((l, i) => ({ avenantId, ...l, ordre: i })));
  const [avenant] = await db.update(avenants).set({
    ...(body.titre !== undefined ? { titre: String(body.titre) } : {}),
    ...(body.description !== undefined ? { description: String(body.description) } : {}),
    ...(body.statut ? { statut: body.statut } : {}),
    tvaPct, totalHT: tot.totalHT, totalTTC: tot.totalTTC, updatedAt: new Date(),
  }).where(eq(avenants.id, avenantId)).returning();
  return NextResponse.json({ avenant: { ...avenant, lignes }, avenants: await lister(devisId) });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await utilisateurDepuis(req);
  if (!user) return nonAuthentifie();
  const proprietaire = await db.select().from(devis).where(and(eq(devis.id, Number(id)), eq(devis.entrepriseId, user.id)));
  if (!proprietaire[0]) return NextResponse.json({ error: "Devis introuvable" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const avenantId = Number(body.avenantId);
  if (!avenantId) return NextResponse.json({ error: "avenantId manquant" }, { status: 400 });
  await db.delete(avenantLignes).where(eq(avenantLignes.avenantId, avenantId));
  await db.delete(avenants).where(eq(avenants.id, avenantId));
  return NextResponse.json({ ok: true, avenants: await lister(Number(id)) });
}
