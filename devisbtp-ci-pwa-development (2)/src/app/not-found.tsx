import Link from "next/link";

export const metadata = { title: "Page introuvable — DevisBTP CI" };

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#F8FAFC] grid place-items-center px-5 py-10">
      <div className="bg-white rounded-3xl p-7 max-w-sm w-full text-center shadow-xl border border-slate-200">
        <img src="/icons/icon-192.png" alt="DevisBTP CI" className="w-14 h-14 rounded-2xl mx-auto shadow-md" />
        <p className="text-[#B45309] font-extrabold text-sm mt-4">ERREUR 404</p>
        <h1 className="font-extrabold text-xl mt-1">Page introuvable</h1>
        <p className="text-sm text-slate-500 mt-2">Cette page n'existe pas ou a été déplacée. Revenez à votre espace de devis.</p>
        <Link href="/" className="mt-5 inline-flex w-full items-center justify-center bg-[#F59E0B] hover:bg-[#D97706] text-white font-extrabold py-3.5 rounded-2xl">Retour à l'application</Link>
        <div className="mt-3 flex justify-center gap-3 text-[12px] font-bold text-slate-500">
          <Link href="/mentions-legales">Mentions légales</Link><Link href="/cgu">CGU</Link><Link href="/confidentialite">Confidentialité</Link>
        </div>
      </div>
    </main>
  );
}
