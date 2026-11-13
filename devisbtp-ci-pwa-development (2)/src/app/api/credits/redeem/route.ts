import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { entreprises } from "@/db/schema";
import { eq } from "drizzle-orm";
import { utilisateurDepuis, nonAuthentifie, comptePublic } from "@/lib/auth";
import { FOUNDER_CODE } from "@/lib/admin";

export const dynamic = "force-dynamic";

/** Code fondateur / collaborateur : accès complet et illimité permanent au compte courant. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const code = String(body.code || "").trim().toUpperCase();
  if (!code || code !== FOUNDER_CODE.toUpperCase()) {
    return NextResponse.json({ error: "Code invalide. Vérifiez le code transmis par le fondateur." }, { status: 400 });
  }
  const ent = await utilisateurDepuis(req);
  if (!ent) return nonAuthentifie();
  const [updated] = await db.update(entreprises).set({
    credits: 9999, plan: "illimite", illimiteExpireAt: null, role: "fondateur",
  }).where(eq(entreprises.id, ent.id)).returning();
  return NextResponse.json({
    ok: true, entreprise: comptePublic(updated),
    message: "Code fondateur activé : accès complet et illimité (devis illimités + analyse de plan IA) sur ce compte. Bienvenue dans l'équipe !",
  });
}
