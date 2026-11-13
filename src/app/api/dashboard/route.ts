import { NextRequest, NextResponse } from "next/server";
import { utilisateurDepuis, nonAuthentifie, comptePublic } from "@/lib/auth";
import { chargerDashboard } from "@/lib/dashboard";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await utilisateurDepuis(req);
  if (!user) return nonAuthentifie();
  const { devis: list, stats } = await chargerDashboard(user.id);
  const publicCompte = comptePublic(user);
  if (user.role === "fondateur" || user.role === "admin") Object.assign(publicCompte, { plan: "illimite", credits: 9999 });
  return NextResponse.json({ entreprise: publicCompte, devis: list, stats });
}
