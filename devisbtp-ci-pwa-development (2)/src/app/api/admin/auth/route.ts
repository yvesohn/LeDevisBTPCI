import { NextRequest, NextResponse } from "next/server";
import { niveauAcces, FOUNDER_CODE, ADMIN_WHATSAPP } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const niveau = niveauAcces(body.pin || body.cle || body.code);
  if (!niveau) {
    return NextResponse.json({ error: "Code d'accès incorrect. Utilisez le PIN administrateur ou le code fondateur." }, { status: 401 });
  }
  return NextResponse.json({ ok: true, niveau, founderCode: FOUNDER_CODE, adminWhatsapp: ADMIN_WHATSAPP });
}
