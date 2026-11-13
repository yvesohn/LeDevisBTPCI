import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { comptePublic, jetonCourant, signerJeton, utilisateurDepuis, utilisateurParJeton } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Synchronise le jeton du navigateur avec la session serveur.
 * Appelée automatiquement par l'application quand un appel API répond AUTH :
 * si le cookie de session est encore valide, on récupère le bon jeton (plus de fausse « session expirée »).
 */
export async function GET(req: NextRequest) {
  const duQuery = req.nextUrl.searchParams.get("token");
  const user = (await utilisateurDepuis(req)) || (await utilisateurParJeton(duQuery));
  if (!user) return NextResponse.json({ compte: null, token: null }, { status: 401 });
  const token = (await jetonCourant()) || duQuery || signerJeton(user.id, user.passwordHash);
  return NextResponse.json({ compte: comptePublic(user), token });
}
