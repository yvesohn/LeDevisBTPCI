import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { entreprises, activations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { utilisateurDepuis, nonAuthentifie, comptePublic } from "@/lib/auth";

export const dynamic = "force-dynamic";

const OFFRES: Record<string, { label: string; montant: number; credits: number }> = {
  unique: { label: "Devis Unique", montant: 4900, credits: 1 },
  pack5: { label: "Pack Pro (5 devis / mois)", montant: 9900, credits: 5 },
  illimite: { label: "Illimité + Plan IA (30 jours)", montant: 24900, credits: 9999 },
};

/**
 * Déblocage immédiat après paiement Wave / Orange Money :
 * les crédits sont activés tout de suite, l'administrateur contrôle a posteriori
 * (référence de transaction visible dans /admin, rejet possible avec annulation).
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const offre = String(body.offre || "");
  const cfg = OFFRES[offre];
  const moyen = body.moyen === "Orange Money" ? "Orange Money" : body.moyen === "Wave" ? "Wave" : null;
  const transactionId = String(body.transactionId || "").trim();
  const telephone = String(body.telephone || "").trim();

  if (!cfg) return NextResponse.json({ error: "Offre inconnue." }, { status: 400 });
  if (!moyen) return NextResponse.json({ error: "Moyen de paiement manquant (Wave ou Orange Money)." }, { status: 400 });
  if (transactionId.length < 6) return NextResponse.json({ error: "Indiquez l'ID de transaction reçu par SMS (au moins 6 caractères)." }, { status: 400 });
  if (telephone.replace(/[^\d]/g, "").length < 8) return NextResponse.json({ error: "Indiquez le numéro de téléphone utilisé pour le paiement." }, { status: 400 });

  const deja = await db.select().from(activations).where(eq(activations.transactionId, transactionId));
  if (deja.length) {
    return NextResponse.json({ error: "Cette référence de transaction a déjà été utilisée pour une activation. Vérifiez l'ID reçu par SMS ou contactez l'administrateur." }, { status: 409 });
  }

  const ent = await utilisateurDepuis(req);
  if (!ent) return nonAuthentifie();

  const planAvant = ent.plan;
  const creditsAvant = ent.credits || 0;
  const dejaIllimitePermanent = planAvant === "illimite" && !ent.illimiteExpireAt;
  let data: Partial<typeof entreprises.$inferInsert> = {};
  if (offre === "unique") {
    data = { credits: creditsAvant >= 9999 ? 9999 : creditsAvant + 1, ...(planAvant === "gratuit" ? { plan: "unique" } : {}) };
  } else if (offre === "pack5") {
    data = { credits: creditsAvant >= 9999 ? 9999 : creditsAvant + 5, plan: planAvant === "illimite" ? "illimite" : "pack5" };
  } else if (dejaIllimitePermanent) {
    // Un accès fondateur permanent ne doit jamais être converti en illimité de 30 jours.
    data = { credits: 9999, plan: "illimite", illimiteExpireAt: null };
  } else {
    data = { credits: 9999, plan: "illimite", illimiteExpireAt: new Date(Date.now() + 30 * 24 * 3600 * 1000) };
  }

  const [activation] = await db.insert(activations).values({
    entrepriseId: ent.id, email: ent.email || "", offre, offreLabel: cfg.label, montant: cfg.montant,
    moyen, transactionId, telephone, creditsAjoutes: cfg.credits, planAvant, creditsAvant, statut: "active",
  }).returning();

  const [updated] = await db.update(entreprises).set(data).where(eq(entreprises.id, ent.id)).returning();
  return NextResponse.json({
    ok: true, activation, entreprise: comptePublic(updated),
    message: offre === "illimite"
      ? "Accès Illimité + IA activé pour 30 jours. Bonne génération de devis !"
      : `${cfg.credits} crédit(s) ajouté(s) instantanément. Nouveau solde : ${updated.credits} crédit(s).`,
  });
}
