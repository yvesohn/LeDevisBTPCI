import { db } from "@/db";
import { entreprises, devis, devisLignes, etapesPlanning, avenants, avenantLignes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { genererDQE, calculerTotaux, genererPlanning } from "./catalogue";
import { hashPassword } from "./auth";

let seeded = false;

export async function ensureSeed() {
  try {
    // Vérifie toujours la base : si le compte socle a disparu (base réinitialisée), on le recrée.
    const deja = await db.select().from(entreprises).limit(1);
    if (deja.length && seeded) return;
    const existing = deja;
    let ent = existing[0];
    if (!ent) {
      const [created] = await db.insert(entreprises).values({
        nom: "SARL Bâtir Ivoire",
        proprietaire: "Kouadio Yao",
        telephone: "+225 07 07 12 34 56",
        email: "contact@batir-ivoire.ci",
        ville: "Abidjan, Cocody — Rue des Jardins",
        adresse: "Rue des Jardins, Cocody, Abidjan, Côte d'Ivoire",
        rccm: "CI-ABJ-2024-B-12 345",
        compteContribuable: "CC 2 412 345 A",
        passwordHash: hashPassword("DevisBTP2026!"),
        role: "fondateur",
        credits: 9999,
        plan: "illimite",
        totalDevisGeneres: 2,
      }).returning();
      ent = created;
    }
    if (ent && !ent.passwordHash) {
      const [maj] = await db.update(entreprises).set({ passwordHash: hashPassword("DevisBTP2026!") }).where(eq(entreprises.id, ent.id)).returning();
      ent = maj;
    }
    // Complète les anciennes entreprises (créées avant l'ajout RCCM/CC) sans écraser un champ vidé volontairement ("").
    if (ent && (ent.rccm === null || ent.compteContribuable === null)) {
      const [maj] = await db.update(entreprises).set({
        rccm: ent.rccm === null ? "CI-ABJ-2024-B-12 345" : ent.rccm,
        compteContribuable: ent.compteContribuable === null ? "CC 2 412 345 A" : ent.compteContribuable,
        adresse: ent.adresse || "Rue des Jardins, Cocody, Abidjan, Côte d'Ivoire",
      }).where(eq(entreprises.id, ent.id)).returning();
      ent = maj;
    }
    const existingDevis = await db.select().from(devis).limit(1);
    if (existingDevis.length === 0 && ent) {
      const seeds = [
        {
          numero: "DV-2026-0018",
          clientNom: "Mme Aya Koné",
          clientTel: "+225 05 44 22 18 90",
          lieu: "Abidjan, Bingerville",
          natureTravaux: "Villa duplex R+1, 5 pièces, salon double hauteur, 180 m² au sol",
          surface: 180, nbPieces: 5, nbEtages: 2, statut: "envoye",
        },
        {
          numero: "DV-2026-0019",
          clientNom: "M. Ibrahim Touré",
          clientTel: "+225 07 47 90 11 23",
          lieu: "Grand-Bassam, Quartier France",
          natureTravaux: "Clôture terrain 600 m² + portail, hauteur 2,10 m",
          surface: 120, nbPieces: 3, nbEtages: 1, statut: "signe",
        },
      ];
      for (const s of seeds) {
        const lignes = genererDQE({ natureTravaux: s.natureTravaux, surface: s.surface, nbPieces: s.nbPieces, nbEtages: s.nbEtages, lieu: s.lieu, hasPhoto: true });
        const tot = calculerTotaux(lignes, 18, 0, 30);
        const [d] = await db.insert(devis).values({
          entrepriseId: ent.id, ...s, photoPlanNom: "plan-scanned.jpg", photoPlanTaille: "1,2 Mo",
          totalHT: tot.totalHT, totalTTC: tot.totalTTC, tvaPct: 18, remisePct: 0,
          mainOeuvrePct: 30, totalMateriaux: tot.totalMateriaux, montantMainOeuvre: tot.montantMainOeuvre,
          margePct: 0, totalMateriauxBase: tot.totalMateriauxBase, montantMarge: 0,
          notes: "Devis exemple généré à l'inscription — normes CI appliquées.",
        }).returning();
        await db.insert(devisLignes).values(lignes.map((l, i) => ({ devisId: d.id, ...l, ordre: i })));
        const planning = genererPlanning({ natureTravaux: s.natureTravaux, surface: s.surface, nbPieces: s.nbPieces, nbEtages: s.nbEtages });
        await db.insert(etapesPlanning).values(planning.map((e, i) => ({ devisId: d.id, etape: e.etape, dureeJours: e.dureeJours, detail: e.detail, ordre: i })));
        // Exemple d'avenant sur le 2e devis (clôture) : portail motorisé demandé après signature.
        if (s.numero === "DV-2026-0019") {
          const avLignes = [
            { designation: "Portail métallique motorisé 4 m (fourniture + pose)", detail: "Supplément demandé par le client après le devis initial", unite: "u", quantite: 1, prixUnitaire: 450000 },
            { designation: "Main-d'œuvre travaux supplémentaires", detail: "Pose, réglage et mise en service", unite: "forfait", quantite: 1, prixUnitaire: 60000 },
          ];
          const ht = avLignes.reduce((sum, l) => sum + l.quantite * l.prixUnitaire, 0);
          const [av] = await db.insert(avenants).values({
            devisId: d.id, numero: `AV-01 AU ${s.numero}`, titre: "Portail motorisé",
            description: "Ajout d'un portail métallique motorisé en remplacement du portail manuel prévu au devis initial.",
            statut: "signe", tvaPct: 18, totalHT: ht, totalTTC: Math.round(ht * 1.18),
          }).returning();
          await db.insert(avenantLignes).values(avLignes.map((l, i) => ({ avenantId: av.id, ...l, ordre: i })));
        }
      }
    }
    // Backfill : planning estimatif IA pour les devis créés avant cette fonctionnalité.
    try {
      const tous = await db.select().from(devis);
      for (const d of tous) {
        const deja = await db.select().from(etapesPlanning).where(eq(etapesPlanning.devisId, d.id)).limit(1);
        if (!deja.length) {
          const planning = genererPlanning({ natureTravaux: d.natureTravaux, surface: d.surface || 100, nbPieces: d.nbPieces || 4, nbEtages: d.nbEtages || 1 });
          await db.insert(etapesPlanning).values(planning.map((e, i) => ({ devisId: d.id, etape: e.etape, dureeJours: e.dureeJours, detail: e.detail, ordre: i })));
        }
      }
    } catch { /* planning optionnel */ }
    seeded = true;
  } catch (e) {
    console.error("seed error", e);
  }
}

/** Compte de démonstration historique (utilisé uniquement pour l'amorçage). */
export async function getEntreprise() {
  await ensureSeed();
  const rows = await db.select().from(entreprises).limit(1);
  const ent = rows[0];
  // Expiration de l'accès illimité (30 jours) : retour automatique à l'offre gratuite.
  if (ent && ent.plan === "illimite" && ent.illimiteExpireAt && new Date(ent.illimiteExpireAt).getTime() <= Date.now()) {
    const [maj] = await db.update(entreprises).set({ plan: "gratuit", credits: 0 }).where(eq(entreprises.id, ent.id)).returning();
    return maj;
  }
  return ent;
}
export { eq };
