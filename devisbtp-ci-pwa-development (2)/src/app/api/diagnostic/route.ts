import { NextRequest, NextResponse } from "next/server";
import { utilisateurDepuis, utilisateurParJeton, nonAuthentifie } from "@/lib/auth";
import { genererDQE, calculerTotaux, genererPlanning } from "@/lib/catalogue";
import { autoriser, ipDe } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

/**
 * Diagnostic technique GRATUIT : vérifie le moteur de calcul sans créer de devis,
 * sans consommer de crédit et sans écrire en base.
 */
export async function POST(req: NextRequest) {
  if (!autoriser(`diag:${ipDe(req)}`, 20, 60_000)) {
    return NextResponse.json({ error: "Trop de tests consécutifs. Patientez une minute." }, { status: 429 });
  }
  const body = await req.json().catch(() => ({}));
  const user = (await utilisateurDepuis(req)) || (await utilisateurParJeton(body.sessionToken));
  if (!user) return nonAuthentifie();

  const t0 = Date.now();
  try {
    const lignes = genererDQE({
      natureTravaux: "Villa plain-pied 3 pièces (test technique)",
      surface: 80, nbPieces: 3, nbEtages: 1, lieu: "Abidjan, Cocody", hasPhoto: false,
      mainOeuvrePct: 30, moMode: "pct",
    });
    const planning = genererPlanning({ natureTravaux: "Villa plain-pied", surface: 80, nbPieces: 3, nbEtages: 1 });
    const tot = calculerTotaux(lignes, 18, 0, 30, 0, "pct");
    const duree = Date.now() - t0;
    const ok = lignes.length > 10 && planning.length >= 3 && tot.totalTTC > 0;
    return NextResponse.json({
      ok,
      lignes: lignes.length,
      planning: planning.length,
      totalTTC: tot.totalTTC,
      dureeMs: duree,
      message: ok
        ? `Moteur IA opérationnel : ${lignes.length} lignes, ${planning.length} étapes de planning, total ${new Intl.NumberFormat("fr-FR").format(tot.totalTTC)} FCFA calculé en ${duree} ms.`
        : "Le moteur de calcul a renvoyé un résultat incomplet.",
    });
  } catch (e: any) {
    console.error("Diagnostic:", e);
    return NextResponse.json({ ok: false, message: `Erreur du moteur de calcul : ${String(e?.message || e)}` }, { status: 500 });
  }
}
