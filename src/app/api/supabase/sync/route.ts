import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  entreprises, devis, devisLignes, etapesPlanning, factures, depenses,
  avenants, avenantLignes, activations, synchronisations,
} from "@/db/schema";
import { asc } from "drizzle-orm";
import { isAdmin } from "@/lib/admin";
import { statutSupabase, remplacerTable, SUPABASE_CONFIGURED, type TableSync } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ORDRE = ["entreprises", "devis", "devis_lignes", "etapes_planning", "factures", "depenses", "avenants", "avenant_lignes", "activations", "synchronisations"] as const;

async function collecter() {
  const [ents, dvs, lignes, planning, facs, deps, avs, avLignes, acts] = await Promise.all([
    db.select().from(entreprises).orderBy(asc(entreprises.id)),
    db.select().from(devis).orderBy(asc(devis.id)),
    db.select().from(devisLignes).orderBy(asc(devisLignes.id)),
    db.select().from(etapesPlanning).orderBy(asc(etapesPlanning.id)),
    db.select().from(factures).orderBy(asc(factures.id)),
    db.select().from(depenses).orderBy(asc(depenses.id)),
    db.select().from(avenants).orderBy(asc(avenants.id)),
    db.select().from(avenantLignes).orderBy(asc(avenantLignes.id)),
    db.select().from(activations).orderBy(asc(activations.id)),
  ]);
  const net = (rows: Record<string, unknown>[]) =>
    rows.map((r) => {
      const o: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(r)) {
        // Le hash de mot de passe et les jetons de session ne quittent jamais le serveur principal.
        if (k === "passwordHash" || k === "password_hash" || k === "token") continue;
        o[k] = v instanceof Date ? v.toISOString() : v;
      }
      return o;
    });
  return {
    entreprises: net(ents as any),
    devis: net(dvs as any),
    devis_lignes: net(lignes as any),
    etapes_planning: net(planning as any),
    factures: net(facs as any),
    depenses: net(deps as any),
    avenants: net(avs as any),
    avenant_lignes: net(avLignes as any),
    activations: net(acts as any),
  } as Record<string, Record<string, unknown>[]>;
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if (!SUPABASE_CONFIGURED) {
    return NextResponse.json({ error: "Supabase non configuré : ajoutez SUPABASE_URL et SUPABASE_KEY dans les variables d'environnement." }, { status: 400 });
  }

  const statut = await statutSupabase([...ORDRE]);
  if (!statut.reachable) return NextResponse.json({ error: statut.message, statut }, { status: 503 });
  if (!statut.ready) {
    return NextResponse.json({
      error: statut.message,
      action: "Exécutez le fichier supabase/schema.sql dans le SQL Editor de votre projet Supabase, puis relancez la synchronisation.",
      statut,
    }, { status: 409 });
  }

  const scope = req.nextUrl.searchParams.get("scope") || "all";
  const debut = new Date();
  const donnees = await collecter();
  const resultats: TableSync[] = [];

  const tablesACibler = scope === "acces" ? (["entreprises"] as string[]) : (ORDRE as readonly string[]).filter((t) => t !== "synchronisations");
  for (const table of tablesACibler) {
    if (table === "synchronisations") continue;
    const lignes = donnees[table] || [];
    try {
      const synced = await remplacerTable(table, lignes);
      resultats.push({ table, local: lignes.length, synced, ok: true });
    } catch (e: any) {
      resultats.push({ table, local: lignes.length, synced: 0, ok: false, error: String(e?.message || e) });
    }
  }

  const ok = resultats.every((r) => r.ok);
  const total = resultats.reduce((s, r) => s + r.synced, 0);
  let message = ok
    ? `Synchronisation terminée : ${resultats.length} tables, ${total} lignes envoyées vers Supabase.`
    : "Synchronisation partielle : certaines tables ont échoué (voir le détail).";
  const messageFinal = scope === "acces"
    ? (ok ? `Accès administrateur et fondateur publiés dans Supabase (${total} compte(s)) : rôle, offre et crédits à jour.` : message)
    : message;

  // Journalise la synchronisation (y compris côté Supabase pour l'historique distant).
  try {
    const [journal] = await db.insert(synchronisations).values({
      sens: "push", statut: ok ? "succes" : "partiel",
      detail: `${messageFinal} ${resultats.filter((r) => !r.ok).map((r) => r.table).join(", ")}`.trim(),
      tables: JSON.stringify(resultats), endedAt: new Date(),
    }).returning();
    if (journal) {
      await remplacerTable("synchronisations", [{
        id: journal.id, sens: journal.sens, statut: journal.statut, detail: journal.detail,
        tables: resultats, started_at: debut.toISOString(), ended_at: new Date().toISOString(),
      }]).catch(() => undefined);
    }
  } catch { /* journal local optionnel */ }

  return NextResponse.json({ ok, message: messageFinal, resultats, dureeMs: Date.now() - debut.getTime(), statut: { url: statut.url, ready: statut.ready } }, { status: ok ? 200 : 207 });
}
