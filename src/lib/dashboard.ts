import "server-only";
import { db } from "@/db";
import { devis, depenses } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

/** Données du tableau de bord, chargées côté serveur pour un premier affichage immédiat. */
export async function chargerDashboard(entrepriseId: number) {
  const rawList = await db.select().from(devis).where(eq(devis.entrepriseId, entrepriseId)).orderBy(desc(devis.createdAt));
  const allDepenses = await db.select().from(depenses);
  const parDevis = new Map<number, number>();
  for (const dep of allDepenses) parDevis.set(dep.devisId, (parDevis.get(dep.devisId) || 0) + (dep.montant || 0));
  const list = rawList.map((d) => {
    const totalDepenses = parDevis.get(d.id) || 0;
    return { ...d, totalDepenses, margeNetteRestante: d.statut === "signe" ? (d.totalHT || 0) - totalDepenses : null };
  });
  const totalMontant = list.reduce((s, d) => s + (d.totalTTC || 0), 0);
  return {
    devis: list,
    stats: {
      nbDevis: list.length,
      totalMontant,
      signes: list.filter((d) => d.statut === "signe").length,
      enCours: list.filter((d) => d.statut === "brouillon" || d.statut === "pret").length,
      envoyes: list.filter((d) => d.statut === "envoye").length,
    },
  };
}
