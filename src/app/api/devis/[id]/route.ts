import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { devis, devisLignes, etapesPlanning, avenants, avenantLignes, factures, depenses } from "@/db/schema";
import { eq, asc, and } from "drizzle-orm";
import { calculerTotaux, appliquerMainOeuvreSelonMode, NORMES_CI, EQUIPE_DEFAUT } from "@/lib/catalogue";
import { utilisateurDepuis, nonAuthentifie } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function getPlanning(devisId: number) {
  return db.select().from(etapesPlanning).where(eq(etapesPlanning.devisId, devisId)).orderBy(asc(etapesPlanning.ordre));
}
async function getAvenants(devisId: number) {
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
  const dId = Number(id);
  const user = await utilisateurDepuis(req);
  if (!user) return nonAuthentifie();
  const rows = await db.select().from(devis).where(and(eq(devis.id, dId), eq(devis.entrepriseId, user.id)));
  if (!rows[0]) return NextResponse.json({ error: "Devis introuvable" }, { status: 404 });
  const lignes = await db.select().from(devisLignes).where(eq(devisLignes.devisId, dId)).orderBy(asc(devisLignes.ordre));
  return NextResponse.json({ devis: rows[0], lignes, planning: await getPlanning(dId), avenants: await getAvenants(dId) });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const dId = Number(id);
  const body = await req.json();
  const { lignes, planning, tvaPct, remisePct, mainOeuvrePct, margePct, validiteJours, formatPdf, materiauxClient, moMode, equipe, statut, notes, clientNom, clientTel, lieu, natureTravaux } = body;
  const user = await utilisateurDepuis(req);
  if (!user) return nonAuthentifie();
  const existing = (await db.select().from(devis).where(and(eq(devis.id, dId), eq(devis.entrepriseId, user.id))))[0];
  if (!existing) return NextResponse.json({ error: "Devis introuvable" }, { status: 404 });

  const moPct = Math.min(100, Math.max(0, Number(mainOeuvrePct ?? existing.mainOeuvrePct ?? NORMES_CI.mainOeuvrePctDefaut)));
  const marge = Math.min(100, Math.max(0, Number(margePct ?? existing.margePct ?? 0)));
  const mode = (moMode ?? existing.moMode) === "equipe" ? "equipe" : "pct";
  const eqp = {
    macons: Number(equipe?.macons ?? existing.moMacons ?? EQUIPE_DEFAUT.macons),
    manoeuvres: Number(equipe?.manoeuvres ?? existing.moManoeuvres ?? EQUIPE_DEFAUT.manoeuvres),
    jours: Number(equipe?.jours ?? existing.moJours ?? EQUIPE_DEFAUT.jours),
    tauxMacon: Number(equipe?.tauxMacon ?? existing.moTauxMacon ?? 7000),
    tauxManoeuvre: Number(equipe?.tauxManoeuvre ?? existing.moTauxManoeuvre ?? 4000),
  };
  const validite = [7, 15, 30].includes(Number(validiteJours)) ? Number(validiteJours) : (existing.validiteJours || 30);

  if (Array.isArray(lignes)) {
    // La main-d'œuvre est toujours recalculée côté serveur selon le mode choisi (% ou équipe).
    const lignesNormees = appliquerMainOeuvreSelonMode(
      lignes.map((l: any) => ({
        section: l.section || "Divers", designation: l.designation || "Ligne", detail: l.detail || "",
        unite: l.unite || "u", quantite: Number(l.quantite) || 0, prixUnitaire: Math.round(Number(l.prixUnitaire) || 0),
      })),
      mode, moPct, eqp
    );
    await db.delete(devisLignes).where(eq(devisLignes.devisId, dId));
    if (lignesNormees.length) await db.insert(devisLignes).values(lignesNormees.map((l, i) => ({ devisId: dId, ...l, ordre: i })));
  }

  if (Array.isArray(planning)) {
    await db.delete(etapesPlanning).where(eq(etapesPlanning.devisId, dId));
    const propres = planning.filter((e: any) => String(e.etape || "").trim()).map((e: any, i: number) => ({
      devisId: dId, etape: String(e.etape), dureeJours: Math.max(0, Math.round(Number(e.dureeJours) || 0)), detail: String(e.detail || ""), ordre: i,
    }));
    if (propres.length) await db.insert(etapesPlanning).values(propres);
  }

  const saved = await db.select().from(devisLignes).where(eq(devisLignes.devisId, dId)).orderBy(asc(devisLignes.ordre));
  const tot = calculerTotaux(saved, Number(tvaPct ?? existing.tvaPct ?? 18), Number(remisePct ?? existing.remisePct ?? 0), moPct, marge, mode, eqp);
  const [updated] = await db.update(devis).set({
    totalHT: tot.totalHT, totalTTC: tot.totalTTC,
    tvaPct: Number(tvaPct ?? existing.tvaPct ?? 18), remisePct: Number(remisePct ?? existing.remisePct ?? 0),
    mainOeuvrePct: moPct, totalMateriaux: tot.totalMateriaux, montantMainOeuvre: tot.montantMainOeuvre,
    margePct: marge, totalMateriauxBase: tot.totalMateriauxBase, montantMarge: tot.montantMarge,
    materiauxClient: materiauxClient !== undefined ? !!materiauxClient : !!existing.materiauxClient, totalMoSeuleTTC: tot.moSeuleTTC, validiteJours: validite, formatPdf: ["general","materiaux","detaille"].includes(formatPdf) ? formatPdf : (existing.formatPdf || "general"), moMode: mode,
    moMacons: eqp.macons, moManoeuvres: eqp.manoeuvres, moJours: eqp.jours, moTauxMacon: eqp.tauxMacon, moTauxManoeuvre: eqp.tauxManoeuvre,
    ...(statut ? { statut } : {}), ...(notes !== undefined ? { notes } : {}),
    ...(clientNom ? { clientNom } : {}), ...(clientTel !== undefined ? { clientTel } : {}),
    ...(lieu ? { lieu } : {}), ...(natureTravaux ? { natureTravaux } : {}),
    updatedAt: new Date(),
  }).where(eq(devis.id, dId)).returning();
  return NextResponse.json({ devis: updated, lignes: saved, planning: await getPlanning(dId), avenants: await getAvenants(dId), totaux: tot });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const dId = Number(id);
  const user = await utilisateurDepuis(req);
  if (!user) return nonAuthentifie();
  const owned = await db.select().from(devis).where(and(eq(devis.id, dId), eq(devis.entrepriseId, user.id)));
  if (!owned[0]) return NextResponse.json({ error: "Devis introuvable" }, { status: 404 });
  const avs = await db.select().from(avenants).where(eq(avenants.devisId, dId));
  for (const a of avs) await db.delete(avenantLignes).where(eq(avenantLignes.avenantId, a.id));
  await db.delete(avenants).where(eq(avenants.devisId, dId));
  await db.delete(factures).where(eq(factures.devisId, dId));
  await db.delete(depenses).where(eq(depenses.devisId, dId));
  await db.delete(etapesPlanning).where(eq(etapesPlanning.devisId, dId));
  await db.delete(devisLignes).where(eq(devisLignes.devisId, dId));
  await db.delete(devis).where(eq(devis.id, dId));
  return NextResponse.json({ ok: true });
}
