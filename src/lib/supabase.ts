import "server-only";

/**
 * Client Supabase côté serveur (API REST PostgREST).
 * La clé publishable n'est jamais envoyée au navigateur : tout passe par des routes API protégées.
 */
// Valeurs par défaut du projet DevisBTP CI (clé « publishable » = clé publique Supabase).
export const SUPABASE_URL = (process.env.SUPABASE_URL || "https://gtgidztabkumyeyznsiq.supabase.co").replace(/\/+$/, "");
export const SUPABASE_KEY = process.env.SUPABASE_KEY || "sb_publishable_98Puib1NzWz1PBfUxKHH6g_lfeD6Fqb";
export const SUPABASE_CONFIGURED = Boolean(SUPABASE_URL && SUPABASE_KEY);

export type TableSync = { table: string; local: number; synced: number; ok: boolean; error?: string };

function entetes(extra: Record<string, string> = {}) {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
    Accept: "application/json",
    ...extra,
  };
}

async function sbFetch(path: string, init: RequestInit = {}, timeoutMs = 25000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(`${SUPABASE_URL}${path}`, { ...init, headers: entetes((init.headers as Record<string, string>) || {}), signal: ctrl.signal, cache: "no-store" });
  } finally {
    clearTimeout(t);
  }
}

/** Vérifie l'accès à Supabase et la présence des tables attendues. */
export async function statutSupabase(tables: string[]) {
  if (!SUPABASE_CONFIGURED) {
    return { configured: false, reachable: false, ready: false, url: SUPABASE_URL, tables: [], message: "Clé Supabase non configurée (SUPABASE_URL / SUPABASE_KEY)." };
  }
  const etat: { table: string; existe: boolean; detail?: string }[] = [];
  let reachable = false;
  for (const table of tables) {
    try {
      const res = await sbFetch(`/rest/v1/${table}?select=id&limit=1`);
      const txt = await res.text();
      reachable = true;
      if (res.ok) etat.push({ table, existe: true });
      else etat.push({ table, existe: false, detail: res.status === 404 ? "Table absente" : `${res.status} ${txt.slice(0, 160)}` });
    } catch (e: any) {
      etat.push({ table, existe: false, detail: e?.name === "AbortError" ? "Délai dépassé" : String(e?.message || e) });
    }
  }
  const manquantes = etat.filter((e) => !e.existe).map((e) => e.table);
  const ready = reachable && manquantes.length === 0;
  return {
    configured: true, reachable, ready, url: SUPABASE_URL, tables: etat,
    message: !reachable
      ? "Supabase injoignable depuis ce serveur (vérifiez le réseau ou l'URL du projet)."
      : ready
        ? "Supabase connecté : tables prêtes pour la synchronisation."
        : `Tables manquantes : ${manquantes.join(", ")}. Exécutez supabase/schema.sql dans le SQL Editor Supabase.`,
  };
}

/** Remplace le contenu d'une table distante par les lignes locales (par lots). */
export async function remplacerTable(table: string, lignes: Record<string, unknown>[]): Promise<number> {
  const del = await sbFetch(`/rest/v1/${table}?id=gte.0`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
  // Une table vide renvoie 200/204 ; un filtre sans résultat est aussi accepté.
  if (!del.ok && del.status !== 404) {
    const txt = await del.text();
    throw new Error(`Suppression ${table} impossible (${del.status}) ${txt.slice(0, 160)}`);
  }
  if (!lignes.length) return 0;
  let insere = 0;
  const taille = 100;
  for (let i = 0; i < lignes.length; i += taille) {
    const lot = lignes.slice(i, i + taille);
    const res = await sbFetch(`/rest/v1/${table}?on_conflict=id`, {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(lot),
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Insertion ${table} impossible (${res.status}) ${txt.slice(0, 200)}`);
    }
    insere += lot.length;
  }
  return insere;
}

export async function lireTable<T = Record<string, unknown>>(table: string, select = "*", order?: string): Promise<T[]> {
  const q = `/rest/v1/${table}?select=${encodeURIComponent(select)}${order ? `&order=${encodeURIComponent(order)}` : ""}`;
  const res = await sbFetch(q);
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Lecture ${table} impossible (${res.status}) ${txt.slice(0, 160)}`);
  }
  return (await res.json()) as T[];
}
