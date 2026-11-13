"use client";

import { useState } from "react";
import {
  Building2, Mail, Lock, User, Phone, ArrowRight, Loader2, ShieldCheck, CheckCircle2,
  Eye, EyeOff, Sparkles, FileText, MessageCircle, Calculator, Stamp, Link2, Wallet,
  CalendarDays, TrendingUp, Smartphone, ArrowLeft,
} from "lucide-react";

type Mode = "login" | "register";
const HERO = "https://images.pexels.com/photos/30661412/pexels-photo-30661412.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=900&w=1400";

const FEATURES = [
  { icon: Sparkles, titre: "DQE généré par IA", texte: "Quantités et prix normés CI : 13 agglos/m², béton 350 kg/m³, acier 90/50 kg/m³, carrelage +10 %." },
  { icon: FileText, titre: "PDF pro en 3 formats", texte: "Général par étapes, par matériaux ou DQE complet — avec logo, RCCM et cachet." },
  { icon: MessageCircle, titre: "WhatsApp & signature", texte: "Partagez le devis ou la liste d'achats, et faites signer le client au doigt." },
  { icon: Calculator, titre: "Main-d'œuvre juste", texte: "En % des matériaux ou par équipe : maçons 7 000 F, manœuvres 4 000 F / jour." },
  { icon: Wallet, titre: "Paiement Wave / Orange Money", texte: "Activation immédiate des crédits avec l'ID de transaction SMS." },
  { icon: TrendingUp, titre: "Marge & dépenses suivies", texte: "Marge secrète, factures d'acompte, avenants et marge nette du chantier." },
];

const ETAPES = [
  { n: "1", titre: "Décrivez le chantier", texte: "Client, lieu, surface, photo du plan : en 3 étapes guidées." },
  { n: "2", titre: "L'IA chiffre le DQE", texte: "Matériaux locaux, quantités calculées, planning prévisionnel, validité de l'offre." },
  { n: "3", titre: "Envoyez et signez", texte: "Ajustez vos prix, téléchargez le PDF, partagez sur WhatsApp, faites signer." },
];

export default function AuthScreen({ onAuth }: { onAuth: (compte: any, token?: string) => void }) {
  const [mode, setMode] = useState<Mode>("login");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", nom: "", proprietaire: "", telephone: "" });
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  function ouvrir(m: Mode) { setMode(m); setShowForm(true); setError(""); window.scrollTo({ top: 0, behavior: "smooth" }); }

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    setError(""); setLoading(true);
    try {
      const path = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body = mode === "login"
        ? { email: form.email, password: form.password }
        : { email: form.email, password: form.password, nom: form.nom, proprietaire: form.proprietaire, telephone: form.telephone };
      const r = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json();
      if (!r.ok) { setError(d.error || "Connexion impossible."); return; }
      onAuth(d.compte, d.token);
    } catch { setError("Connexion au serveur impossible. Vérifiez votre réseau puis réessayez."); }
    finally { setLoading(false); }
  }

  async function connexionDemo() {
    setMode("login"); setError(""); setLoading(true); setShowForm(true);
    try {
      const r = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "contact@batir-ivoire.ci", password: "DevisBTP2026!" }) });
      const d = await r.json();
      if (!r.ok) { setError(d.error || "Connexion impossible."); return; }
      onAuth(d.compte, d.token);
    } catch { setError("Connexion au serveur impossible. Vérifiez votre réseau."); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      {/* En-tête */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
          <img src="/icons/icon-192.png" alt="DevisBTP CI" className="w-10 h-10 rounded-2xl ring-1 ring-slate-200 shadow-sm" />
          <div className="min-w-0 flex-1">
            <p className="font-extrabold leading-none tracking-tight">DevisBTP <span className="text-[#D97706]">CI</span></p>
            <p className="text-[11px] text-slate-500 mt-0.5 hidden sm:block">Devis de travaux par IA — Côte d'Ivoire</p>
          </div>
          {!showForm ? (
            <div className="flex items-center gap-2">
              <button onClick={() => ouvrir("login")} className="text-sm font-bold text-slate-600 px-3 py-2.5 rounded-xl hover:bg-slate-100 transition">Se connecter</button>
              <button onClick={() => ouvrir("register")} className="bg-[#F59E0B] hover:bg-[#D97706] text-white text-sm font-extrabold px-4 py-2.5 rounded-xl shadow-lg shadow-amber-200 transition active:scale-95">Créer un compte</button>
            </div>
          ) : (
            <button onClick={() => setShowForm(false)} className="text-sm font-bold text-slate-500 flex items-center gap-1.5 px-3 py-2.5 rounded-xl hover:bg-slate-100 transition"><ArrowLeft size={15} /> Accueil</button>
          )}
        </div>
      </header>

      {!showForm ? (
        <>
          {/* HERO */}
          <section className="relative overflow-hidden bg-[#0F172A] text-white">
            <img src={HERO} alt="Chantier en Côte d'Ivoire" className="absolute inset-0 w-full h-full object-cover opacity-40" />
            <div className="absolute inset-0 bg-gradient-to-br from-[#0F172A] via-[#0F172A]/85 to-[#D97706]/40" />
            <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-20 grid lg:grid-cols-[1.15fr_.85fr] gap-10 items-center">
              <div>
                <span className="inline-flex items-center gap-2 bg-white/10 border border-white/15 text-[12px] font-bold px-3 py-1.5 rounded-full"><Sparkles size={13} className="text-[#FCD34D]" /> Nouveau : analyse de plan photo par IA</span>
                <h1 className="font-extrabold text-[34px] sm:text-[46px] leading-[1.05] tracking-tight mt-5">
                  Vos devis de chantier,<br /><span className="text-[#FBBF24]">chiffrés en 2 minutes.</span>
                </h1>
                <p className="text-white/70 text-[15px] sm:text-[17px] mt-4 max-w-xl leading-relaxed">
                  Devis Quantitatif Estimatif complet aux prix du marché ivoirien, PDF professionnel à votre nom, partage WhatsApp et signature client. Pensé pour les entrepreneurs du bâtiment en Côte d'Ivoire.
                </p>
                <div className="flex flex-col sm:flex-row gap-2.5 mt-7">
                  <button onClick={() => ouvrir("register")} className="bg-[#F59E0B] hover:bg-[#D97706] text-white font-extrabold px-6 py-4 rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-amber-900/30 transition active:scale-[.98]">
                    <Sparkles size={18} /> Commencer — 1 devis offert
                  </button>
                  <button onClick={() => ouvrir("login")} className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-extrabold px-6 py-4 rounded-2xl flex items-center justify-center gap-2 transition active:scale-[.98]">
                    Se connecter <ArrowRight size={17} />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-8 max-w-md">
                  {[["13", "agglos/m² normés"], ["350", "kg/m³ béton"], ["3", "formats de PDF"]].map(([n, l]) => (
                    <div key={l} className="bg-white/5 border border-white/10 rounded-2xl px-3 py-3">
                      <p className="font-extrabold text-[22px] text-[#FBBF24] tnum leading-none">{n}</p>
                      <p className="text-[11px] text-white/60 mt-1 leading-tight">{l}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Carte produit */}
              <div className="bg-white text-[#0F172A] rounded-[1.6rem] p-4 sm:p-5 shadow-2xl border border-white/40 rotate-0 lg:rotate-1">
                <div className="flex items-center gap-2.5">
                  <span className="bg-[#F59E0B] text-white w-9 h-9 rounded-xl grid place-items-center shrink-0"><Building2 size={17} /></span>
                  <div className="min-w-0"><p className="font-extrabold text-[13.5px] truncate">Villa duplex R+1 — Bingerville</p><p className="text-[11px] text-slate-500">DQE · 180 m² · 5 pièces · 2 niveaux</p></div>
                  <span className="ml-auto text-[10px] font-extrabold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 px-2 py-1 rounded-full shrink-0 flex items-center gap-1"><CheckCircle2 size={11} /> Prêt</span>
                </div>
                <div className="mt-3.5 space-y-2">
                  {[["Fondations & béton armé", 34], ["Maçonnerie & élévation", 26], ["Toiture & charpente", 16], ["Finitions & revêtements", 24]].map(([lot, pct]) => (
                    <div key={lot as string}>
                      <div className="flex justify-between text-[12px] font-bold"><span>{lot}</span><span className="text-slate-500 tnum">{pct} %</span></div>
                      <div className="h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden"><div className="h-full bg-[#F59E0B] rounded-full" style={{ width: `${pct}%` }} /></div>
                    </div>
                  ))}
                </div>
                <div className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-3 mt-3.5">
                  <div className="flex justify-between text-[12px] text-slate-500"><span>Total HT</span><span className="tnum">46 700 000 F</span></div>
                  <div className="flex justify-between text-[12px] text-slate-500"><span>TVA 18 %</span><span className="tnum">8 406 000 F</span></div>
                  <div className="flex justify-between font-extrabold text-[15px] border-t border-slate-200 pt-1.5 mt-1.5"><span>Total TTC</span><span className="text-[#B45309] tnum">55 106 000 F</span></div>
                </div>
                <div className="grid grid-cols-3 gap-1.5 mt-3">
                  {[{ i: FileText, t: "PDF" }, { i: MessageCircle, t: "WhatsApp" }, { i: Link2, t: "Signature" }].map(({ i: I, t }) => (
                    <div key={t} className="bg-white border border-slate-200 rounded-xl py-2 text-center"><I size={15} className="mx-auto text-[#D97706]" /><p className="text-[10px] font-extrabold mt-1 text-slate-600">{t}</p></div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Bandeau confiance */}
          <section className="bg-white border-b border-slate-200">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { icon: ShieldCheck, t: "Données privées par compte" },
                { icon: Stamp, t: "Logo, RCCM & cachet sur PDF" },
                { icon: Smartphone, t: "Application installable" },
                { icon: CalendarDays, t: "Planning de chantier IA" },
              ].map(({ icon: I, t }) => (
                <div key={t} className="flex items-center gap-2 text-[12px] font-bold text-slate-600"><I size={16} className="text-[#D97706] shrink-0" /> {t}</div>
              ))}
            </div>
          </section>

          {/* Fonctionnalités */}
          <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
            <div className="text-center max-w-2xl mx-auto">
              <span className="text-[12px] font-extrabold uppercase tracking-wide text-[#B45309]">Tout ce qu'il faut sur le chantier</span>
              <h2 className="font-extrabold text-[26px] sm:text-[32px] leading-tight tracking-tight mt-2">Un devis propre, du métré à la signature</h2>
              <p className="text-slate-500 mt-2">Normes de construction ivoiriennes, prix locaux modifiables, documents professionnels.</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5 mt-8">
              {FEATURES.map(({ icon: I, titre, texte }) => (
                <div key={titre} className="card rounded-3xl p-5 hover:shadow-lg transition">
                  <span className="bg-amber-50 text-[#B45309] w-11 h-11 rounded-2xl grid place-items-center ring-1 ring-amber-200"><I size={20} /></span>
                  <h3 className="font-extrabold mt-3.5">{titre}</h3>
                  <p className="text-[13px] text-slate-500 mt-1 leading-relaxed">{texte}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Étapes + CTA */}
          <section className="bg-[#0F172A] text-white">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
              <h2 className="font-extrabold text-[24px] sm:text-[30px] tracking-tight text-center">Trois étapes, un devis signé</h2>
              <div className="grid sm:grid-cols-3 gap-3.5 mt-8">
                {ETAPES.map((e) => (
                  <div key={e.n} className="bg-white/5 border border-white/10 rounded-3xl p-5">
                    <span className="w-9 h-9 rounded-full bg-[#F59E0B] text-white font-extrabold grid place-items-center">{e.n}</span>
                    <h3 className="font-extrabold mt-3">{e.titre}</h3>
                    <p className="text-[13px] text-white/60 mt-1 leading-relaxed">{e.texte}</p>
                  </div>
                ))}
              </div>
              {/* Tarifs publics */}
              <div className="mt-12">
                <div className="text-center">
                  <span className="text-[12px] font-extrabold uppercase tracking-wide text-[#FBBF24]">Tarifs en FCFA — sans abonnement caché</span>
                  <h2 className="font-extrabold text-[24px] sm:text-[30px] tracking-tight mt-2">Payez seulement quand vous chiffrez</h2>
                </div>
                <div className="grid sm:grid-cols-3 gap-3 mt-6">
                  {[
                    { nom: "Devis Unique", prix: "4 900", unite: "FCFA / devis", points: ["1 devis DQE complet", "PDF A4 & A3", "Partage WhatsApp", "Signature client"], pop: false },
                    { nom: "Pack Pro", prix: "9 900", unite: "FCFA / mois", points: ["5 devis / mois", "Tous formats PDF", "Factures d'acompte", "Support prioritaire"], pop: true },
                    { nom: "Illimité + Plan IA", prix: "24 900", unite: "FCFA / mois", points: ["Devis illimités", "Analyse avancée du plan", "Tous les modules", "Support 7j/7"], pop: false },
                  ].map((o) => (
                    <div key={o.nom} className={`rounded-3xl p-5 border ${o.pop ? "bg-[#F59E0B] border-[#F59E0B] text-white shadow-2xl" : "bg-white/5 border-white/15 text-white"}`}>
                      {o.pop && <span className="text-[10px] font-extrabold bg-white/25 px-2 py-1 rounded-full">LE PLUS CHOISI</span>}
                      <h3 className="font-extrabold mt-2">{o.nom}</h3>
                      <p className="mt-2"><span className="font-extrabold text-[30px] leading-none">{o.prix}</span> <span className={`text-[12px] font-bold ${o.pop ? "text-white/80" : "text-white/60"}`}>{o.unite}</span></p>
                      <ul className="mt-3 space-y-1.5">{o.points.map((pt) => <li key={pt} className="flex gap-2 text-[12.5px]"><CheckCircle2 size={14} className={`shrink-0 mt-0.5 ${o.pop ? "text-white" : "text-emerald-400"}`} />{pt}</li>)}</ul>
                      <button onClick={() => ouvrir("register")} className={`mt-4 w-full font-extrabold py-3 rounded-xl text-sm ${o.pop ? "bg-[#0F172A] text-white" : "bg-white text-[#0F172A]"}`}>Choisir cette offre</button>
                    </div>
                  ))}
                </div>
                <p className="text-center text-[12px] text-white/50 mt-3">Paiement Wave ou Orange Money · Activation immédiate avec l'ID de transaction · 1 devis offert à l'inscription</p>
              </div>

              <div className="bg-gradient-to-r from-[#F59E0B] to-[#D97706] rounded-3xl p-6 sm:p-8 mt-8 flex flex-col sm:flex-row items-center gap-4 justify-between">
                <div>
                  <h3 className="font-extrabold text-[21px] leading-tight">Créez votre compte entreprise gratuitement</h3>
                  <p className="text-[13.5px] text-white/85 mt-1">1 devis offert à l'inscription, sans carte bancaire. Paiement Wave / Orange Money ensuite.</p>
                </div>
                <button onClick={() => ouvrir("register")} className="bg-white text-[#0F172A] font-extrabold px-6 py-3.5 rounded-2xl flex items-center gap-2 shrink-0 shadow-lg active:scale-[.98] transition">Créer mon compte <ArrowRight size={17} /></button>
              </div>
            </div>
          </section>

          <footer className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12px] font-bold text-slate-500">
              <a href="/mentions-legales" className="hover:text-[#B45309]">Mentions légales</a>
              <a href="/cgu" className="hover:text-[#B45309]">Conditions générales</a>
              <a href="/confidentialite" className="hover:text-[#B45309]">Confidentialité</a>
              <a href="/admin" className="hover:text-[#B45309]">Espace administrateur</a>
            </div>
            <p className="text-center text-[12px] text-slate-400 mt-3">DevisBTP CI — devis de travaux pour les entrepreneurs du bâtiment en Côte d'Ivoire · TVA 18 % · Estimations indicatives à confirmer</p>
            <p className="text-center text-[11px] text-slate-400 mt-1">© {new Date().getFullYear()} DevisBTP CI · Abidjan, Côte d'Ivoire</p>
          </footer>
        </>
      ) : (
        /* ÉCRAN DE CONNEXION / INSCRIPTION */
        <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden">
          <img src={HERO} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-[#0F172A]/90 backdrop-blur-[2px]" />
          <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 grid lg:grid-cols-[1fr_.95fr] gap-8 items-start">
            <div className="text-white hidden lg:block pt-6">
              <h1 className="font-extrabold text-[30px] leading-tight tracking-tight">Votre espace entreprise,<br /><span className="text-[#FBBF24]">privé et professionnel.</span></h1>
              <p className="text-white/65 text-[14px] mt-3 leading-relaxed max-w-md">Chaque compte retrouve ses devis, ses prix et son profil entreprise. Vos données ne sont jamais partagées avec un autre utilisateur.</p>
              <ul className="mt-6 space-y-2.5">
                {["Devis, avenants et factures d'acompte centralisés", "PDF à votre nom avec logo, RCCM et cachet", "Signature client par lien et suivi des dépenses", "Accès illimité possible par code fondateur"].map((t) => (
                  <li key={t} className="flex gap-2.5 text-[13.5px] text-white/80"><CheckCircle2 size={17} className="text-emerald-400 shrink-0 mt-0.5" /> {t}</li>
                ))}
              </ul>
            </div>

            <div className="bg-white rounded-[1.75rem] shadow-2xl border border-slate-200 p-5 sm:p-6">
              <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1.5 rounded-2xl">
                <button onClick={() => { setMode("login"); setError(""); }} className={`py-2.5 rounded-xl font-extrabold text-sm transition ${mode === "login" ? "bg-white shadow text-[#0F172A]" : "text-slate-500"}`}>Se connecter</button>
                <button onClick={() => { setMode("register"); setError(""); }} className={`py-2.5 rounded-xl font-extrabold text-sm transition ${mode === "register" ? "bg-white shadow text-[#0F172A]" : "text-slate-500"}`}>Créer un compte</button>
              </div>
              <h2 className="font-extrabold text-[19px] mt-4 leading-tight">{mode === "login" ? "Connexion à votre espace" : "Nouveau compte entreprise"}</h2>
              <p className="text-[12.5px] text-slate-500 mt-0.5">{mode === "login" ? "Retrouvez vos devis et votre profil entreprise." : "1 devis gratuit offert, sans carte bancaire."}</p>

              <form onSubmit={submit} className="mt-4 space-y-3">
                {mode === "register" && (
                  <>
                    <label className="block">
                      <span className="text-[11px] font-extrabold text-slate-500 flex items-center gap-1.5"><Building2 size={12} /> NOM DE L'ENTREPRISE *</span>
                      <input value={form.nom} onChange={set("nom")} placeholder="Ex : SARL Bâtir Ivoire" required className="w-full border-2 border-slate-200 rounded-2xl px-4 py-3 mt-1 font-semibold outline-none focus:border-[#F59E0B] transition" />
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                      <label className="block"><span className="text-[11px] font-extrabold text-slate-500 flex items-center gap-1.5"><User size={12} /> DIRIGEANT</span>
                        <input value={form.proprietaire} onChange={set("proprietaire")} placeholder="Kouadio Yao" className="w-full border-2 border-slate-200 rounded-2xl px-4 py-3 mt-1 font-medium outline-none focus:border-[#F59E0B] transition" /></label>
                      <label className="block"><span className="text-[11px] font-extrabold text-slate-500 flex items-center gap-1.5"><Phone size={12} /> TÉLÉPHONE</span>
                        <input value={form.telephone} onChange={set("telephone")} placeholder="07 07 12 34 56" inputMode="tel" className="w-full border-2 border-slate-200 rounded-2xl px-4 py-3 mt-1 font-medium outline-none focus:border-[#F59E0B] transition" /></label>
                    </div>
                  </>
                )}
                <label className="block">
                  <span className="text-[11px] font-extrabold text-slate-500 flex items-center gap-1.5"><Mail size={12} /> ADRESSE E-MAIL *</span>
                  <input type="email" value={form.email} onChange={set("email")} placeholder="contact@monentreprise.ci" required autoComplete="email" className="w-full border-2 border-slate-200 rounded-2xl px-4 py-3 mt-1 font-semibold outline-none focus:border-[#F59E0B] transition" />
                </label>
                <label className="block">
                  <span className="text-[11px] font-extrabold text-slate-500 flex items-center gap-1.5"><Lock size={12} /> MOT DE PASSE *</span>
                  <div className="relative mt-1">
                    <input type={show ? "text" : "password"} value={form.password} onChange={set("password")} placeholder={mode === "register" ? "8 caractères minimum" : "Votre mot de passe"} required autoComplete={mode === "register" ? "new-password" : "current-password"} className="w-full border-2 border-slate-200 rounded-2xl px-4 py-3 pr-12 font-semibold outline-none focus:border-[#F59E0B] transition" />
                    <button type="button" onClick={() => setShow(!show)} aria-label="Afficher le mot de passe" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 p-1 hover:text-slate-600">{show ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                  </div>
                </label>

                {error && <p className="bg-red-50 text-red-700 border border-red-200 text-[13px] rounded-xl px-3.5 py-2.5">{error}</p>}

                <button type="submit" disabled={loading} className="w-full bg-[#F59E0B] hover:bg-[#D97706] disabled:opacity-60 text-white font-extrabold py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-amber-200 active:scale-[.98] transition">
                  {loading ? <><Loader2 size={18} className="animate-spin" /> Vérification…</> : <>{mode === "login" ? "Se connecter" : "Créer mon compte gratuit"} <ArrowRight size={18} /></>}
                </button>
              </form>

              <div className="flex items-center gap-2 my-3.5"><span className="flex-1 h-px bg-slate-200" /><span className="text-[10.5px] font-extrabold text-slate-400">OU</span><span className="flex-1 h-px bg-slate-200" /></div>

              <button onClick={connexionDemo} disabled={loading} className="w-full border-2 border-[#F59E0B]/60 bg-amber-50 rounded-2xl py-3 text-[13px] font-extrabold text-[#92400E] flex items-center justify-center gap-2 hover:bg-amber-100 transition disabled:opacity-60">
                <Sparkles size={15} /> Connexion directe — compte fondateur
              </button>
              <p className="text-[11px] text-slate-400 text-center mt-1.5">contact@batir-ivoire.ci · DevisBTP2026!</p>
              <p className="text-[11px] text-slate-400 text-center mt-3 flex items-center justify-center gap-1.5"><ShieldCheck size={12} /> Mot de passe chiffré · chaque compte ne voit que ses devis.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
