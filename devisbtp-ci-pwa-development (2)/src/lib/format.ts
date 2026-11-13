export function fcfa(n: number) {
  return new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " FCFA";
}
export function nombre(n: number) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(n);
}
export function dateFr(d: string | Date | null) {
  if (!d) return "—";
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}
