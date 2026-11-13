import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { synchronisations } from "@/db/schema";
import { desc } from "drizzle-orm";
import { isAdmin, niveauAcces } from "@/lib/admin";
import { statutSupabase, SUPABASE_URL, SUPABASE_KEY } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export const TABLES_SYNC = [
  "entreprises", "devis", "devis_lignes", "etapes_planning", "factures", "depenses",
  "avenants", "avenant_lignes", "activations", "synchronisations",
] as const;

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const statut = await statutSupabase([...TABLES_SYNC]);
  let historique: unknown[] = [];
  try {
    historique = await db.select().from(synchronisations).orderBy(desc(synchronisations.id)).limit(5);
  } catch { /* migration non appliquée */ }
  return NextResponse.json({
    ...statut,
    url: SUPABASE_URL,
    cleMasquee: "••••••••" + SUPABASE_KEY.slice(-6),
    niveau: niveauAcces(req.headers.get("x-admin-key") || req.headers.get("x-admin-pin")),
    historique,
    schemaSql: "supabase/schema.sql",
  });
}
