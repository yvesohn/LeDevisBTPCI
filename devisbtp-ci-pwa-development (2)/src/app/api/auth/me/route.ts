import { NextRequest, NextResponse } from "next/server";
import { utilisateurDepuis, comptePublic } from "@/lib/auth";
import { illimiteActif } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await utilisateurDepuis(req);
  if (!user) return NextResponse.json({ compte: null }, { status: 401 });
  return NextResponse.json({ compte: { ...comptePublic(user), illimiteActif: illimiteActif(user) } });
}
