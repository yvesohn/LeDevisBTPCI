import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { entreprises } from "@/db/schema";
import { eq } from "drizzle-orm";
import { utilisateurDepuis, nonAuthentifie, comptePublic } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const ent = await utilisateurDepuis(req);
  if (!ent) return nonAuthentifie();
  return NextResponse.json({ entreprise: comptePublic(ent) });
}

const MAX_IMAGE = 900_000; // ~900 Ko par image (logo / signature / cachet)

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const ent = await utilisateurDepuis(req);
  if (!ent) return nonAuthentifie();

  for (const key of ["logoData", "signatureData", "cachetData"] as const) {
    const v = body[key];
    if (v && (typeof v !== "string" || !v.startsWith("data:image/") || v.length > MAX_IMAGE)) {
      return NextResponse.json({ error: `Image ${key} invalide ou trop lourde (max ~650 Ko après compression). Réessayez avec une image plus petite.` }, { status: 400 });
    }
  }
  // Mise à jour partielle autorisée (ex : seulement le format PDF par défaut).
  if (body.nom !== undefined && !String(body.nom).trim()) {
    return NextResponse.json({ error: "Le nom de l'entreprise est obligatoire." }, { status: 400 });
  }

  const champs = ["nom", "proprietaire", "telephone", "email", "ville", "adresse", "rccm", "compteContribuable", "logoData", "logoNom", "signatureData", "signatureNom", "cachetData", "cachetNom", "formatPdfDefaut"] as const;
  const data: Record<string, string> = {};
  for (const c of champs) if (body[c] !== undefined) data[c] = String(body[c] ?? "");
  if (data.formatPdfDefaut && !["general", "materiaux", "detaille"].includes(data.formatPdfDefaut)) {
    return NextResponse.json({ error: "Format PDF par défaut invalide." }, { status: 400 });
  }

  const [updated] = await db.update(entreprises).set(data).where(eq(entreprises.id, ent.id)).returning();
  return NextResponse.json({ entreprise: comptePublic(updated), message: "Profil entreprise enregistré — il apparaîtra sur vos prochains PDF." });
}
