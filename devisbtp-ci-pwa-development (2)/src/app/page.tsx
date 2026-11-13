import DevisApp from "@/components/DevisApp";
import { utilisateurCourant, comptePublic, signerJeton } from "@/lib/auth";
import { chargerDashboard } from "@/lib/dashboard";

export const dynamic = "force-dynamic";

/** Délai de garde : la page s'affiche même si la base tarde (évite un écran figé / timeout proxy). */
function avecDelai<T>(promesse: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promesse.catch(() => null),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

export default async function HomePage() {
  let compte: any = null;
  let devis: any[] = [];
  let stats: any = null;
  let token: string | null = null;
  try {
    const user = await avecDelai(utilisateurCourant(), 4000);
    if (user) {
      compte = comptePublic(user);
      if (user.role === "fondateur" || user.role === "admin") Object.assign(compte, { plan: "illimite", credits: 9999 });
      token = signerJeton(user.id, user.passwordHash);
      const data = await avecDelai(chargerDashboard(user.id), 5000);
      devis = data?.devis ?? [];
      stats = data?.stats ?? null;
    }
  } catch {
    // Base indisponible : l'écran de connexion reste accessible, l'application se relance côté client.
  }
  return <DevisApp initialCompte={compte} initialDevis={devis} initialStats={stats} initialToken={token} />;
}
