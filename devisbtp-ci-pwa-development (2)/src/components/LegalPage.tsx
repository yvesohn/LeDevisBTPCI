import Link from "next/link";
import { ArrowLeft, Building2 } from "lucide-react";
import type { ReactNode } from "react";

export default function LegalPage({ titre, surtitre, children }: { titre: string; surtitre: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center gap-3">
          <Link href="/" className="w-10 h-10 grid place-items-center rounded-2xl bg-slate-100 text-slate-700 shrink-0"><ArrowLeft size={18} /></Link>
          <img src="/icons/icon-192.png" alt="DevisBTP CI" className="w-9 h-9 rounded-xl ring-1 ring-slate-200" />
          <div className="min-w-0 flex-1"><p className="font-extrabold leading-none">DevisBTP <span className="text-[#D97706]">CI</span></p><p className="text-[11px] text-slate-500 mt-0.5">Devis de travaux par IA — Côte d'Ivoire</p></div>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-8 pb-16">
        <p className="text-[12px] font-extrabold uppercase tracking-wide text-[#B45309]">{surtitre}</p>
        <h1 className="font-extrabold text-[28px] tracking-tight mt-1.5 leading-tight">{titre}</h1>
        <div className="card rounded-3xl p-5 sm:p-7 mt-5 space-y-5 text-[14px] leading-relaxed text-slate-600 [&_h2]:text-[#0F172A] [&_h2]:font-extrabold [&_h2]:text-[16px] [&_h2]:mt-5 [&_h2:first-child]:mt-0 [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-[#0F172A]">
          {children}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/" className="bg-[#F59E0B] text-white font-extrabold px-4 py-3 rounded-2xl text-sm flex items-center gap-2"><Building2 size={16} /> Retour à l'application</Link>
          <Link href="/mentions-legales" className="bg-white border border-slate-300 text-slate-700 font-bold px-4 py-3 rounded-2xl text-sm">Mentions légales</Link>
          <Link href="/cgu" className="bg-white border border-slate-300 text-slate-700 font-bold px-4 py-3 rounded-2xl text-sm">CGU</Link>
          <Link href="/confidentialite" className="bg-white border border-slate-300 text-slate-700 font-bold px-4 py-3 rounded-2xl text-sm">Confidentialité</Link>
        </div>
      </main>
    </div>
  );
}
