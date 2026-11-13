import { NextRequest, NextResponse } from "next/server";
import { autoriser, ipDe } from "@/lib/rateLimit";
import { db } from "@/db";
import { entreprises } from "@/db/schema";
import { eq } from "drizzle-orm";
import { creerSession, verifyPassword, comptePublic } from "@/lib/auth";
import { ensureSeed } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!autoriser(`auth:${ipDe(req)}`, 12, 60000)) {
    return NextResponse.json({ error: "Trop de tentatives. Patientez une minute puis réessayez." }, { status: 429 });
  }
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  if (!email || !password) return NextResponse.json({ error: "E-mail et mot de passe requis." }, { status: 400 });

  // Garantit l'existence du compte fondateur de démonstration sur une base neuve.
  await ensureSeed().catch(() => undefined);
  const rows = await db.select().from(entreprises).where(eq(entreprises.email, email));
  const compte = rows[0];
  if (!compte || !verifyPassword(password, compte.passwordHash)) {
    return NextResponse.json({ error: "E-mail ou mot de passe incorrect." }, { status: 401 });
  }
  if (compte.bloque) {
    return NextResponse.json({ error: "Accès suspendu. Contactez l'administrateur DevisBTP CI pour réactiver votre compte." }, { status: 403 });
  }
  const token = await creerSession(compte.id, compte.passwordHash);
  return NextResponse.json({ token, compte: comptePublic(compte), message: `Bienvenue ${compte.proprietaire || compte.nom} !` });
}
