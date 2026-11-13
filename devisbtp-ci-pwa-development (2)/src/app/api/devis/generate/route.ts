import { NextRequest, NextResponse } from "next/server";
import { autoriser, ipDe } from "@/lib/rateLimit";
import { db } from "@/db";
import { devis, devisLignes, entreprises, etapesPlanning } from "@/db/schema";
import { eq } from "drizzle-orm";
import { utilisateurDepuis, nonAuthentifie, comptePublic } from "@/lib/auth";
import { genererDQE, calculerTotaux, genererPlanning, EQUIPE_DEFAUT } from "@/lib/catalogue";
import { illimiteActif } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    return await handleGenerate(req);
  } catch (e) {
    console.error("Erreur génération devis:", e);
    return NextResponse.json({ error: "Le serveur n'a pas pu générer le devis. Réessayez dans quelques instants — aucun crédit n'a été débité." }, { status: 500 });
  }
}

async function handleGenerate(req: NextRequest) {
  if (!autoriser(`gen:${ipDe(req)}`, 30, 60_000)) {
    return NextResponse.json({ error: "Trop de générations en peu de temps. Patientez une minute." }, { status: 429 });
  }
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Demande invalide (données illisibles)." }, { status: 400 });
  const { clientNom, clientTel, lieu, natureTravaux, surface, nbPieces, nbEtages, photoPlanNom, photoPlanTaille, prix, mainOeuvrePct, margePct, validiteJours, moMode, equipe, formatPdf, materiauxClient, sessionToken } = body;
  if (!clientNom?.trim() || !lieu?.trim() || !natureTravaux?.trim()) {
    return NextResponse.json({ error: "Nom du client, lieu et nature des travaux sont obligatoires." }, { status: 400 });
  }
  // Trois chemins d'authentification : cookie, en-têtes, puis jeton présent dans le corps JSON.
  const ent = await utilisateurDepuis(req, body);
  if (!ent) return nonAuthentifie();
  // Un compte fondateur ou administrateur ne consomme jamais de crédit.
  const illimite = illimiteActif(ent) || ent.role === "fondateur" || ent.role === "admin";
  if (!illimite && ent.credits <= 0) {
    return NextResponse.json({ error: "Crédits épuisés. Rechargez via Wave ou Orange Money pour générer un nouveau devis.", code: "NO_CREDIT" }, { status: 402 });
  }
  const surf = Number(surface) || 100;
  const moPct = Math.min(100, Math.max(0, Number(mainOeuvrePct ?? 30)));
  const marge = Math.min(100, Math.max(0, Number(margePct ?? 0)));
  const validite = [7, 15, 30].includes(Number(validiteJours)) ? Number(validiteJours) : 30;
  const mode = moMode === "equipe" ? "equipe" : "pct";
  const eqp = { ...EQUIPE_DEFAUT, ...(equipe || {}) };
  const lignes = genererDQE({ natureTravaux, surface: surf, nbPieces: Number(nbPieces) || 4, nbEtages: Number(nbEtages) || 1, lieu, hasPhoto: !!photoPlanNom, prix: prix || undefined, mainOeuvrePct: moPct, moMode: mode, equipe: eqp });
  const tot = calculerTotaux(lignes, 18, 0, moPct, marge, mode, eqp);
  const planning = genererPlanning({ natureTravaux, surface: surf, nbPieces: Number(nbPieces) || 4, nbEtages: Number(nbEtages) || 1 });
  const countRes = await db.select().from(devis).where(eq(devis.entrepriseId, ent.id));
  const numero = `DV-2026-${String(countRes.length + 20).padStart(4, "0")}`;
  // Transaction : devis + lignes + planning + crédit sont enregistrés ensemble, ou pas du tout.
  const result = await db.transaction(async (tx) => {
    const [created] = await tx.insert(devis).values({
      entrepriseId: ent.id, numero, clientNom: clientNom.trim(), clientTel: clientTel || "", lieu, natureTravaux,
      surface: surf, nbPieces: Number(nbPieces) || 4, nbEtages: Number(nbEtages) || 1,
      photoPlanNom: photoPlanNom || "", photoPlanTaille: photoPlanTaille || "",
      statut: "pret", totalHT: tot.totalHT, totalTTC: tot.totalTTC, tvaPct: 18, remisePct: 0,
      mainOeuvrePct: moPct, totalMateriaux: tot.totalMateriaux, montantMainOeuvre: tot.montantMainOeuvre,
      margePct: marge, totalMateriauxBase: tot.totalMateriauxBase, montantMarge: tot.montantMarge,
      materiauxClient: !!materiauxClient, totalMoSeuleTTC: tot.moSeuleTTC, validiteJours: validite, formatPdf: ["general", "materiaux", "detaille"].includes(formatPdf) ? formatPdf : (["general", "materiaux", "detaille"].includes(ent.formatPdfDefaut || "") ? ent.formatPdfDefaut : "general"), moMode: mode,
      moMacons: Number(eqp.macons) || 0, moManoeuvres: Number(eqp.manoeuvres) || 0, moJours: Number(eqp.jours) || 0,
      moTauxMacon: Number(eqp.tauxMacon) || 7000, moTauxManoeuvre: Number(eqp.tauxManoeuvre) || 4000,
      notes: photoPlanNom ? `Plan analysé par IA : ${photoPlanNom}. Quantités selon normes CI (13 agglos/m², béton 350 kg/m³). Planning estimatif IA inclus.` : "Estimation IA sans plan — quantités à confirmer sur site. Normes CI appliquées (13 agglos/m², béton 350 kg/m³). Planning estimatif IA inclus.",
    }).returning();
    await tx.insert(devisLignes).values(lignes.map((l, i) => ({ devisId: created.id, ...l, ordre: i })));
    await tx.insert(etapesPlanning).values(planning.map((e, i) => ({ devisId: created.id, etape: e.etape, dureeJours: e.dureeJours, detail: e.detail, ordre: i })));
    if (!illimite) {
      await tx.update(entreprises).set({ credits: ent.credits - 1, totalDevisGeneres: (ent.totalDevisGeneres || 0) + 1 }).where(eq(entreprises.id, ent.id));
    } else {
      await tx.update(entreprises).set({ totalDevisGeneres: (ent.totalDevisGeneres || 0) + 1 }).where(eq(entreprises.id, ent.id));
    }
    const savedLignes = await tx.select().from(devisLignes).where(eq(devisLignes.devisId, created.id)).orderBy(devisLignes.ordre);
    const savedPlanning = await tx.select().from(etapesPlanning).where(eq(etapesPlanning.devisId, created.id)).orderBy(etapesPlanning.ordre);
    const updatedEnt = (await tx.select().from(entreprises).where(eq(entreprises.id, ent.id)))[0];
    return { created, savedLignes, savedPlanning, updatedEnt };
  });
  return NextResponse.json({ devis: result.created, lignes: result.savedLignes, planning: result.savedPlanning, entreprise: comptePublic(result.updatedEnt), totaux: tot });
}
