import { NextResponse } from "next/server";
import { detruireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  await detruireSession();
  return NextResponse.json({ ok: true });
}
