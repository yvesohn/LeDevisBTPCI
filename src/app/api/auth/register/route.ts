import { NextRequest, NextResponse } from "next/server";
import { autoriser, ipDe } from "@/lib/rateLimit";
import { db } from "@/db";
import { entreprises } from "@/db/schema";
import { eq } from "drizzle-orm";
import { creerSession, hashPassword, emailValide, comptePublic } from "@/lib/auth";
import { ensureSeed } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!autoriser(`auth:${ipDe(req)}`, 6, 300000)) {
    return NextResponse.json({ error: "Trop de tentatives. Patientez une minute puis réessayez." }, { status: 429 });
  }
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const nom = String(body.nom || "").trim();
  const proprietaire = String(body.proprietaire || "").trim();
  const telephone = String(body.telephone || "").trim();

  if (!emailValide(email)) return NextResponse.json({ error: "Adresse e-mail invalide (ex : contact@monentreprise.ci)." }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "Le mot de passe doit contenir au moins 8 caractères." }, { status: 400 });
  if (nom.length < 2) return NextResponse.json({ error: "Indiquez le nom de votre entreprise." }, { status: 400 });

  await ensureSeed().catch(() => undefined);
  const existant = await db.select().from(entreprises).where(eq(entreprises.email, email));
  if (existant.length) return NextResponse.json({ error: "Un compte existe déjà avec cet e-mail. Connectez-vous." }, { status: 409 });

  const [created] = await db.insert(entreprises).values({
    nom, proprietaire, telephone, email, ville: "Abidjan, Cocody", adresse: "",
    passwordHash: hashPassword(password), role: "client", credits: 1, plan: "gratuit", totalDevisGeneres: 0,
  }).returning();

  const token = await creerSession(created.id, created.passwordHash);
  return NextResponse.json({ token, compte: comptePublic(created), message: "Compte créé : 1 devis gratuit offert !" });
}
