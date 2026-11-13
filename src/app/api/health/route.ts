import { db } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

const APP_VERSION = "2026.11.12-5-auth-universelle";

/**
 * Sonde de disponibilité : renvoie TOUJOURS 200 tant que l'application répond,
 * avec l'état détaillé de la base. Une base lente ne doit pas faire croire
 * à la plateforme que le service est tombé.
 */
export async function GET() {
  const debut = Date.now();
  try {
    await Promise.race([
      db.execute(sql`select 1`),
      new Promise((_, rej) => setTimeout(() => rej(new Error("delai")), 3000)),
    ]);
    return Response.json({ ok: true, version: APP_VERSION, base: "connectée", latenceMs: Date.now() - debut, heure: new Date().toISOString() });
  } catch {
    return Response.json({ ok: true, version: APP_VERSION, base: "indisponible", latenceMs: Date.now() - debut, heure: new Date().toISOString(), note: "Application en ligne ; base de données momentanément injoignable." });
  }
}
