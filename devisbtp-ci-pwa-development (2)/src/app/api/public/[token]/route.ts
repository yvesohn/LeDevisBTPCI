import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { devis } from "@/db/schema";
import { eq } from "drizzle-orm";
import { chargerDevisPublic } from "@/lib/publicDevis";

export const dynamic = "force-dynamic";

export async function GET(_: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await chargerDevisPublic(token);
  if (!data) return NextResponse.json({ error: "Lien invalide ou expiré. Demandez un nouveau lien à l'entrepreneur." }, { status: 404 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const rows = await db.select().from(devis).where(eq(devis.shareToken, token));
  const d = rows[0];
  if (!d) return NextResponse.json({ error: "Lien invalide." }, { status: 404 });
  if (d.signedAt) return NextResponse.json({ error: "Ce devis a déjà été signé électroniquement.", signedAt: d.signedAt }, { status: 409 });
  const body = await req.json().catch(() => ({}));
  const nom = String(body.nom || "").trim();
  const signature = String(body.signatureData || "");
  if (nom.length < 2) return NextResponse.json({ error: "Indiquez votre nom complet pour signer." }, { status: 400 });
  if (!signature.startsWith("data:image/") || signature.length < 500 || signature.length > 700_000) {
    return NextResponse.json({ error: "Signature manquante ou illisible. Signez avec votre doigt dans le cadre prévu." }, { status: 400 });
  }
  if (body.acceptation !== true) return NextResponse.json({ error: "Cochez la case d'acceptation du devis pour valider." }, { status: 400 });
  const [maj] = await db.update(devis).set({
    signatureClientData: signature, signatureClientNom: nom, signedAt: new Date(), statut: "signe", updatedAt: new Date(),
  }).where(eq(devis.id, d.id)).returning();
  return NextResponse.json({ ok: true, signedAt: maj.signedAt, signatureClientNom: nom, message: "Devis signé électroniquement. Le chantier est validé, merci de votre confiance !" });
}
