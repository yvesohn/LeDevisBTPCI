"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErreurApp({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("Erreur applicative:", error); }, [error]);
  return (
    <main className="min-h-screen bg-[#F8FAFC] grid place-items-center px-5 py-10">
      <div className="bg-white rounded-3xl p-7 max-w-md w-full text-center shadow-xl border border-slate-200">
        <img src="/icons/icon-192.png" alt="DevisBTP CI" className="w-14 h-14 rounded-2xl mx-auto shadow-md" />
        <h1 className="font-extrabold text-xl mt-4">Un incident est survenu</h1>
        <p className="text-sm text-slate-500 mt-2">
          L'application n'a pas pu afficher cette page. Vos devis sont conservés : réessayez, ou revenez à l'accueil.
        </p>
        <div className="grid gap-2 mt-5">
          <button onClick={() => reset()} className="w-full bg-[#F59E0B] hover:bg-[#D97706] text-white font-extrabold py-3.5 rounded-2xl">Réessayer</button>
          <Link href="/" className="w-full bg-slate-900 text-white font-extrabold py-3.5 rounded-2xl">Retour à l'accueil</Link>
        </div>
        {error.digest && <p className="text-[10.5px] text-slate-400 mt-3">Référence : {error.digest}</p>}
      </div>
    </main>
  );
}
