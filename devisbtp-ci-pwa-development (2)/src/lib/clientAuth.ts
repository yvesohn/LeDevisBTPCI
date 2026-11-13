"use client";

/**
 * Jeton de session côté navigateur, envoyé sur TOUS les canaux possibles.
 * Certains proxys (aperçu de plateforme) filtrent les cookies et les en-têtes :
 * le jeton est donc aussi ajouté en paramètre d'URL (GET) et dans le corps JSON (POST/PUT/DELETE).
 */
const KEY = "dbtp_token";
let memoire = "";

export function getToken(): string {
  if (memoire) return memoire;
  try { memoire = localStorage.getItem(KEY) || sessionStorage.getItem(KEY) || ""; } catch { /* stockage bloqué */ }
  if (!memoire) {
    try {
      const m = document.cookie.match(/(?:^|; )dbtp_token=([^;]+)/);
      if (m) memoire = decodeURIComponent(m[1]);
    } catch { /* ignore */ }
  }
  return memoire;
}

export function setToken(token: string) {
  memoire = token || "";
  try { if (token) localStorage.setItem(KEY, token); } catch { /* stockage bloqué : la mémoire suffit */ }
  try { if (token) sessionStorage.setItem(KEY, token); } catch { /* ignore */ }
  try {
    const https = location.protocol === "https:";
    const attrs = https ? "Path=/; SameSite=None; Secure; Partitioned" : "Path=/; SameSite=Lax";
    document.cookie = token ? `dbtp_token=${token}; Max-Age=${30 * 24 * 3600}; ${attrs}` : `dbtp_token=; Max-Age=0; ${attrs}`;
  } catch { /* ignore */ }
}

export function clearToken() {
  memoire = "";
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  try { sessionStorage.removeItem(KEY); } catch { /* ignore */ }
  try {
    const https = location.protocol === "https:";
    document.cookie = `dbtp_token=; Max-Age=0; ${https ? "Path=/; SameSite=None; Secure; Partitioned" : "Path=/; SameSite=Lax"}`;
  } catch { /* ignore */ }
}

/** Ajoute le jeton en paramètre d'URL (canal qui traverse les proxys filtrants). */
function urlAvecJeton(url: string, token: string): string {
  try {
    const u = new URL(url, window.location.origin);
    if (!u.searchParams.has("dbtp_token")) u.searchParams.set("dbtp_token", token);
    return u.pathname + u.search + u.hash;
  } catch {
    return url.includes("?") ? `${url}&dbtp_token=${encodeURIComponent(token)}` : `${url}?dbtp_token=${encodeURIComponent(token)}`;
  }
}

/** Injecte le jeton dans un corps JSON (POST/PUT/DELETE/PATCH). */
function corpsAvecJeton(body: BodyInit | null | undefined, token: string): BodyInit | null | undefined {
  if (body == null) return JSON.stringify({ sessionToken: token });
  if (typeof body === "string") {
    try {
      const obj = JSON.parse(body);
      if (obj && typeof obj === "object" && !Array.isArray(obj) && !obj.sessionToken) {
        obj.sessionToken = token;
        return JSON.stringify(obj);
      }
    } catch { /* corps non-JSON : on n'y touche pas */ }
    return body;
  }
  return body; // FormData / Blob : non modifiable, l'URL prend le relais
}

let installed = false;

export function installFetchAuth() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  const original = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    if (!url.includes("/api/")) return original(input as any, init);
    const token = getToken();
    if (!token) return original(input as any, init);

    const method = (init?.method || (input instanceof Request ? input.method : "GET") || "GET").toUpperCase();
    const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
    if (!headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);
    if (!headers.has("x-session-token")) headers.set("x-session-token", token);

    const lecture = method === "GET" || method === "HEAD";
    const cible = lecture ? urlAvecJeton(url, token) : url;
    const corps = lecture ? init?.body : corpsAvecJeton(init?.body as BodyInit | null | undefined, token);
    // L'URL porte aussi le jeton pour les écritures (double canal).
    const finale = lecture ? cible : urlAvecJeton(cible, token);
    return original(finale as any, { ...init, headers, body: corps as any });
  };
}
