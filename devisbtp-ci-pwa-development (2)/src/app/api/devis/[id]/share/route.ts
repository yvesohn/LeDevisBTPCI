import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { devis } from "@/db/schema";
import { eq } from "drizzle-orm";
import { randomBytes } from "crypto";
import { utilisateurDepuis, nonAuthentifie } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await utilisateurDepuis(req);
  if (!user) return nonAuthentifie();
  const rows = await db.select().from(devis).where(eq(devis.id, Number(id)));
  const d = rows[0];
  if (!d || d.entrepriseId !== user.id) return NextResponse.json({ error: "Devis introuvable" }, { status: 404 });
  if (!d) return NextResponse.json({ error: "Devis introuvable" }, { status: 404 });
  let token = d.shareToken;
  if (!token) {
    token = randomBytes(18).toString("base64url");
    const [maj] = await db.update(devis).set({ shareToken: token }).where(eq(devis.id, d.id)).returning();
    return NextResponse.json({ token, path: `/signer/${token}`, devis: maj });
  }
  return NextResponse.json({ token, path: `/signer/${token}`, devis: d });
}
