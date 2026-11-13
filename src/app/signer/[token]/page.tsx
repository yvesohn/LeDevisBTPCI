import SignatureClient from "@/components/SignatureClient";
import { chargerDevisPublic } from "@/lib/publicDevis";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Signer votre devis — DevisBTP CI",
  description: "Consultez et signez électroniquement votre devis de travaux.",
};

export default async function SignerPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  let data: Awaited<ReturnType<typeof chargerDevisPublic>> = null;
  let erreur = "";
  try {
    data = await chargerDevisPublic(token);
  } catch (e) {
    erreur = "Le devis n'a pas pu être chargé. Vérifiez votre connexion puis rechargez la page.";
    console.error("Erreur page signature:", e);
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-[#F8FAFC] grid place-items-center px-5 py-10">
        <div className="bg-white rounded-3xl p-7 max-w-sm w-full text-center shadow-xl border border-slate-200">
          <img src="/icons/icon-192.png" alt="DevisBTP CI" className="w-14 h-14 rounded-2xl mx-auto shadow-md" />
          <h1 className="font-extrabold text-xl mt-4">Lien indisponible</h1>
          <p className="text-sm text-slate-500 mt-2">{erreur || "Ce lien de devis est invalide, expiré ou a été remplacé. Demandez un nouveau lien à votre entrepreneur."}</p>
          <Link href="/" className="mt-5 inline-flex w-full items-center justify-center bg-[#F59E0B] hover:bg-[#D97706] text-white font-extrabold py-3.5 rounded-2xl">Ouvrir DevisBTP CI</Link>
          <p className="text-[11px] text-slate-400 mt-3">Entrepreneur ? Connectez-vous pour renvoyer le lien au client.</p>
        </div>
      </main>
    );
  }

  return <SignatureClient token={token} initialData={data} />;
}
