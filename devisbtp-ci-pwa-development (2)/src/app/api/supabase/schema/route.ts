import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { isAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

/** Renvoie le script SQL Supabase (protégé par la clé admin) pour copier/coller dans le SQL Editor. */
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  try {
    const sql = await readFile(path.join(process.cwd(), "supabase", "schema.sql"), "utf8");
    return new NextResponse(sql, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Script supabase/schema.sql introuvable." }, { status: 404 });
  }
}
