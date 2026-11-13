import "server-only";
import { db } from "@/db";
import { devis, devisLignes, etapesPlanning, avenants, entreprises } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { lignesClient, clauseValidite, listeAchatsMateriaux, calculerTotaux } from "@/lib/catalogue";

/** Charge un devis pour la page publique de signature (aucune donnée sensible : ni marge, ni prix de revient). */
export async function chargerDevisPublic(token: string) {
  if (!token) return null;
  const rows = await db.select().from(devis).where(eq(devis.shareToken, token));
  const d = rows[0];
  if (!d) return null;

  const base = await db.select().from(devisLignes).where(eq(devisLignes.devisId, d.id)).orderBy(asc(devisLignes.ordre));
  const client = lignesClient(
    base.map((l) => ({ section: l.section, designation: l.designation, detail: l.detail || "", unite: l.unite, quantite: l.quantite, prixUnitaire: l.prixUnitaire })),
    d.margePct || 0, d.mainOeuvrePct || 30, d.moMode === "equipe" ? "equipe" : "pct",
    { macons: d.moMacons, manoeuvres: d.moManoeuvres, jours: d.moJours, tauxMacon: d.moTauxMacon, tauxManoeuvre: d.moTauxManoeuvre }
  );
  const totPub = calculerTotaux(
    base.map((l) => ({ section: l.section, designation: l.designation, detail: l.detail || "", unite: l.unite, quantite: l.quantite, prixUnitaire: l.prixUnitaire })),
    d.tvaPct || 18, d.remisePct || 0, d.mainOeuvrePct || 30, d.margePct || 0,
    d.moMode === "equipe" ? "equipe" : "pct",
    { macons: d.moMacons, manoeuvres: d.moManoeuvres, jours: d.moJours, tauxMacon: d.moTauxMacon, tauxManoeuvre: d.moTauxManoeuvre }
  );
  const planning = await db.select().from(etapesPlanning).where(eq(etapesPlanning.devisId, d.id)).orderBy(asc(etapesPlanning.ordre));
  const avs = await db.select().from(avenants).where(eq(avenants.devisId, d.id)).orderBy(asc(avenants.createdAt));
  const entRows = await db.select().from(entreprises).limit(1);
  const ent = entRows[0];

  return {
    entreprise: ent ? {
      nom: ent.nom, proprietaire: ent.proprietaire, telephone: ent.telephone, email: ent.email,
      adresse: ent.adresse || ent.ville, rccm: ent.rccm, compteContribuable: ent.compteContribuable,
      logoData: ent.logoData, signatureData: ent.signatureData, cachetData: ent.cachetData,
    } : null,
    devis: {
      numero: d.numero, clientNom: d.clientNom, lieu: d.lieu, natureTravaux: d.natureTravaux,
      surface: d.surface, nbPieces: d.nbPieces, nbEtages: d.nbEtages,
      totalHT: d.totalHT, totalTTC: d.totalTTC, tvaPct: d.tvaPct, remisePct: d.remisePct,
      validiteJours: d.validiteJours || 30, clause: clauseValidite(d.validiteJours || 30, d.createdAt),
      statut: d.statut, createdAt: d.createdAt,
      signe: !!d.signedAt, signatureClientNom: d.signatureClientNom, signedAt: d.signedAt, signatureClientData: d.signatureClientData,
      formatPdf: d.formatPdf || "general", materiauxClient: !!d.materiauxClient,
      materiauxQuantites: listeAchatsMateriaux(client as any),
      moSeuleHT: totPub.moSeuleHT, moSeuleTTC: totPub.moSeuleTTC, montantMainOeuvre: totPub.montantMainOeuvre,
    },
    lignes: client,
    planning,
    avenants: avs.map((a) => ({ numero: a.numero, titre: a.titre, totalTTC: a.totalTTC, statut: a.statut })),
  };
}
