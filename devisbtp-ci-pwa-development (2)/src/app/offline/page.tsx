import Link from "next/link";

export const metadata = { title: "Hors ligne — DevisBTP CI" };

export default function OfflinePage() {
  return (
    <main className="min-h-screen bg-[#F8FAFC] grid place-items-center px-5 py-10">
      <div className="bg-white rounded-3xl p-7 max-w-sm w-full text-center shadow-xl border border-slate-200">
        <img src="/icons/icon-192.png" alt="DevisBTP CI" className="w-16 h-16 rounded-2xl mx-auto shadow-md" />
        <h1 className="font-extrabold text-xl mt-4">Vous êtes hors ligne</h1>
        <p className="text-sm text-slate-500 mt-2">DevisBTP CI a besoin d'une connexion pour générer un devis ou enregistrer vos données. Vos devis déjà consultés restent disponibles dès que la connexion revient.</p>
        <Link href="/" className="mt-5 inline-flex w-full items-center justify-center bg-[#F59E0B] hover:bg-[#D97706] text-white font-extrabold py-3.5 rounded-2xl">Réessayer</Link>
        <p className="text-[11px] text-slate-400 mt-3">Astuce : installez l'application pour un accès en un toucher depuis votre écran d'accueil.</p>
      </div>
    </main>
  );
}
