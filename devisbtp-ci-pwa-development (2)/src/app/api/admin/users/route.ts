import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { devis } from "@/db/schema";
import { entreprises } from "@/db/schema";
import { eq, ilike, or, desc } from "drizzle-orm";
import { isAdmin, illimiteActif } from "@/lib/admin";

export const dynamic = "force-dynamic";

async function vue(e: typeof entreprises.$inferSelect) {
  const dv = await db.select().from(devis).where(eq(devis.entrepriseId, e.id));
  const montant = dv.reduce((s, d) => s + (d.totalTTC || 0), 0);
  return {
    id: e.id, nom: e.nom, proprietaire: e.proprietaire, email: e.email, telephone: e.telephone,
    credits: e.credits, plan: e.plan, illimiteActif: illimiteActif(e), role: e.role, bloque: e.bloque,
    illimiteExpireAt: e.illimiteExpireAt, totalDevisGeneres: e.totalDevisGeneres, createdAt: e.createdAt,
    nbDevis: dv.length, montantDevise: montant,
  };
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const q = (req.nextUrl.searchParams.get("q") || "").trim();
  const rows = q
    ? await db.select().from(entreprises).where(or(ilike(entreprises.email, `%${q}%`), ilike(entreprises.nom, `%${q}%`), ilike(entreprises.proprietaire, `%${q}%`))).orderBy(desc(entreprises.id))
    : await db.select().from(entreprises).orderBy(desc(entreprises.id)).limit(50);
  return NextResponse.json({ users: await Promise.all(rows.map(vue)) });
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const body = await req.json();
  const email = String(body.email || "").trim().toLowerCase();
  if (!email.includes("@")) return NextResponse.json({ error: "Adresse e-mail invalide." }, { status: 400 });
  const existant = await db.select().from(entreprises).where(eq(entreprises.email, email));
  if (existant[0]) return NextResponse.json({ user: await vue(existant[0]), message: "Un compte existe déjà avec cet e-mail." });
  const [created] = await db.insert(entreprises).values({
    nom: String(body.nom || email.split("@")[0]),
    proprietaire: String(body.proprietaire || ""),
    telephone: String(body.telephone || ""),
    email, credits: 0, plan: "gratuit", totalDevisGeneres: 0,
  }).returning();
  return NextResponse.json({ user: await vue(created), message: "Compte créé — vous pouvez maintenant lui attribuer une offre." });
}
