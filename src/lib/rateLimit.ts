import "server-only";

type Seau = { compteur: number; reset: number };
const seaux = new Map<string, Seau>();

/**
 * Limiteur de débit en mémoire (par instance) pour protéger connexion et génération.
 * Retourne false si la limite est atteinte.
 */
export function autoriser(cle: string, max: number, fenetreMs: number): boolean {
  const now = Date.now();
  const seau = seaux.get(cle);
  if (!seau || now > seau.reset) {
    seaux.set(cle, { compteur: 1, reset: now + fenetreMs });
    if (seaux.size > 5000) seaux.clear();
    return true;
  }
  seau.compteur += 1;
  return seau.compteur <= max;
}

export function ipDe(req: Request) {
  const h = req.headers;
  return (h.get("x-forwarded-for") || h.get("x-real-ip") || "local").split(",")[0].trim();
}
