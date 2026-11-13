"use client";

import { useState } from "react";
import { ShieldCheck, Search, UserPlus, Coins, Infinity as InfinityIcon, Crown, Copy, CheckCircle2, Lock, Building2, LogOut, Database, RefreshCw, AlertTriangle } from "lucide-react";
import { dateFr } from "@/lib/format";

type User = any;

export default function AdminPanel() {
  const [pin, setPin] = useState("");
  const [auth, setAuth] = useState<null | { founderCode: string; adminWhatsapp: string; niveau?: string }>(null);
  const [authError, setAuthError] = useState("");
  const [checking, setChecking] = useState(false);
  const [q, setQ] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [searched, setSearched] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [activations, setActivations] = useState<any[]>([]);
  const [sbStatus, setSbStatus] = useState<any>(null);
  const [sbLoading, setSbLoading] = useState(false);
  const [sbSyncing, setSbSyncing] = useState(false);
  const [sbResult, setSbResult] = useState<any>(null);
  const [newNom, setNewNom] = useState("");

  const headers = { "Content-Type": "application/json", "x-admin-key": pin, "x-admin-pin": pin };

  async function login() {
    setChecking(true); setAuthError("");
    try {
      const r = await fetch("/api/admin/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin }) });
      const d = await r.json();
      if (!r.ok) { setAuthError(d.error || "PIN incorrect"); return; }
      setAuth(d);
      const list = await fetch("/api/admin/users", { headers }).then((x) => x.json()).catch(() => ({ users: [] }));
      setUsers(list.users || []); setSearched(true);
      const acts = await fetch("/api/admin/activations", { headers }).then((x) => x.json()).catch(() => ({ activations: [] }));
      setActivations(acts.activations || []);
      await chargerSupabase();
    } catch { setAuthError("Connexion impossible au serveur."); } finally { setChecking(false); }
  }

  async function search() {
    const r = await fetch(`/api/admin/users?q=${encodeURIComponent(q)}`, { headers });
    const d = await r.json();
    setUsers(d.users || []); setSearched(true); setMessage("");
  }

  async function createUser() {
    if (!newEmail.includes("@")) { setMessage("Entrez un e-mail valide pour créer le compte."); return; }
    const r = await fetch("/api/admin/users", { method: "POST", headers, body: JSON.stringify({ email: newEmail, nom: newNom }) });
    const d = await r.json();
    setMessage(d.message || d.error || "");
    if (r.ok) { setQ(newEmail); const list = await fetch(`/api/admin/users?q=${encodeURIComponent(newEmail)}`, { headers }).then((x) => x.json()); setUsers(list.users || []); setSearched(true); }
  }

  async function activate(user: User, action: "unique" | "pack5" | "illimite" | "fondateur", label: string) {
    if (!confirm(`${label} pour ${user.email} ?`)) return;
    setBusy(`${user.id}-${action}`);
    try {
      const r = await fetch("/api/admin/activate", { method: "POST", headers, body: JSON.stringify({ entrepriseId: user.id, action }) });
      const d = await r.json();
      setMessage(d.message || d.error || "");
      if (r.ok) await search();
    } finally { setBusy(""); }
  }

  async function chargerSupabase() {
    setSbLoading(true);
    try {
      const r = await fetch("/api/supabase/status", { headers });
      const d = await r.json();
      setSbStatus(d);
    } catch { setSbStatus({ reachable: false, ready: false, message: "Vérification impossible (réseau)." }); }
    finally { setSbLoading(false); }
  }

  async function synchroniser(scope: "all" | "acces" = "all") {
    setSbSyncing(true); setSbResult(null);
    try {
      const r = await fetch(`/api/supabase/sync${scope === "acces" ? "?scope=acces" : ""}`, { method: "POST", headers });
      const d = await r.json();
      setSbResult({ status: r.status, ...d });
      setMessage(d.message || d.error || "");
      await chargerSupabase();
    } catch { setSbResult({ ok: false, error: "Connexion impossible au serveur." }); }
    finally { setSbSyncing(false); }
  }

  async function decider(act: any, decision: "valider" | "rejeter") {
    const txt = decision === "rejeter"
      ? `Rejeter l'activation ${act.transactionId} (${act.moyen}) et ANNULER les crédits débloqués pour ${act.entrepriseEmail} ?`
      : `Valider définitivement le paiement ${act.moyen} ${act.transactionId} de ${act.entrepriseEmail} ?`;
    if (!confirm(txt)) return;
    setBusy(`act-${act.id}`);
    try {
      const r = await fetch("/api/admin/activations", { method: "POST", headers, body: JSON.stringify({ activationId: act.id, decision }) });
      const d = await r.json();
      setMessage(d.message || d.error || "");
      if (r.ok) { setActivations(d.activations || []); await search(); }
    } finally { setBusy(""); }
  }

  async function controler(u: any, action: string, extra: Record<string, string> = {}) {
    const labels: Record<string, string> = {
      role: `Attribuer le rôle « ${extra.role} » à ${u.email} ?`,
      suspendre: `Suspendre l'accès de ${u.email} ? Ses sessions seront fermées.`,
      reactiver: `Réactiver l'accès de ${u.email} ?`,
      mot_de_passe: `Définir un nouveau mot de passe pour ${u.email} ?`,
      supprimer: `Neutraliser le compte ${u.email} (accès révoqué définitivement) ?`,
    };
    if (!confirm(labels[action] || action)) return;
    setBusy(`acc-${u.id}-${action}`);
    try {
      const r = await fetch("/api/admin/access", { method: "POST", headers, body: JSON.stringify({ entrepriseId: u.id, action, ...extra }) });
      const d = await r.json();
      setMessage(d.message || d.error || "");
      if (r.ok) await search();
    } finally { setBusy(""); }
  }

  function roleBadge(role: string, bloque: boolean) {
    if (bloque) return <span className="bg-red-100 text-red-700 text-[11px] font-extrabold px-2.5 py-1 rounded-full">SUSPENDU</span>;
    if (role === "fondateur") return <span className="bg-slate-900 text-[#FCD34D] text-[11px] font-extrabold px-2.5 py-1 rounded-full inline-flex items-center gap-1"><Crown size={11} /> FONDATEUR</span>;
    if (role === "admin") return <span className="bg-violet-100 text-violet-700 text-[11px] font-extrabold px-2.5 py-1 rounded-full">ADMIN</span>;
    if (role === "collaborateur") return <span className="bg-sky-100 text-sky-700 text-[11px] font-extrabold px-2.5 py-1 rounded-full">COLLABORATEUR</span>;
    return <span className="bg-slate-100 text-slate-600 text-[11px] font-extrabold px-2.5 py-1 rounded-full">CLIENT</span>;
  }

  if (!auth) {
    return (
      <main className="min-h-screen bg-[#0F172A] text-white grid place-items-center px-4 py-10">
        <div className="w-full max-w-sm bg-white text-[#0F172A] rounded-3xl p-6 shadow-2xl animate-scaleIn">
          <span className="bg-[#0F172A] text-white w-12 h-12 rounded-2xl grid place-items-center"><Lock size={22} /></span>
          <h1 className="font-extrabold text-xl mt-4">Espace Administrateur</h1>
          <p className="text-sm text-slate-500 mt-1">Espace fondateur & administrateur : activations, contrôle des paiements et gestion des accès.</p>
          <label className="block mt-5"><span className="text-xs font-extrabold text-slate-500">CODE PIN ADMINISTRATEUR OU CODE FONDATEUR</span>
            <input type="password" autoComplete="off" value={pin} onChange={(e) => setPin(e.target.value)} onKeyDown={(e) => e.key === "Enter" && login()} placeholder="PIN ou code fondateur" className="w-full border-2 border-slate-200 rounded-2xl px-4 py-3.5 mt-1.5 font-extrabold tracking-[.2em] text-center outline-none focus:border-[#F59E0B]" /></label>
          {authError && <p className="bg-red-50 text-red-700 border border-red-200 text-sm rounded-xl px-3.5 py-2.5 mt-3">{authError}</p>}
          <button onClick={login} disabled={checking || !pin} className="mt-4 w-full bg-[#F59E0B] hover:bg-[#D97706] disabled:opacity-50 text-white font-extrabold py-3.5 rounded-2xl flex items-center justify-center gap-2"><ShieldCheck size={18} /> {checking ? "Vérification…" : "Accéder à l'espace admin"}</button>
          <p className="text-[11px] text-slate-400 text-center mt-3">Page non référencée dans l'application — accès direct par URL uniquement.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-[#0F172A] pb-16">
      <header className="bg-[#0F172A] text-white px-4 py-4 sticky top-0 z-20 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <span className="bg-[#F59E0B] w-10 h-10 rounded-xl grid place-items-center shrink-0"><ShieldCheck size={20} /></span>
          <div className="flex-1 min-w-0"><h1 className="font-extrabold">Admin DevisBTP CI</h1><p className="text-[12px] text-white/60 truncate">{auth.niveau === "fondateur" ? "Session fondateur — contrôle total" : "Session administrateur"} • paiements & accès</p></div>
          <button onClick={() => { setAuth(null); setPin(""); }} className="bg-white/10 text-sm font-bold px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 shrink-0"><LogOut size={15} /> Quitter</button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 space-y-4">
        {/* Code fondateur */}
        <section className="bg-slate-900 text-white rounded-3xl p-5 shadow-xl">
          <h2 className="font-extrabold flex items-center gap-2"><Crown className="text-[#FCD34D]" size={19} /> Code Fondateur & Collaborateurs</h2>
          <p className="text-[13px] text-white/65 mt-1">Ce code donne un <b className="text-white">accès complet et illimité permanent</b> (devis illimités + analyse IA + espace d'administration) et s'utilise de deux façons :</p>
          <ul className="text-[12px] text-white/60 mt-1.5 space-y-1 list-disc ml-4">
            <li>dans l'application : <b className="text-white">Mes Prix → Code fondateur</b> pour activer l'illimité du compte ;</li>
            <li>sur cette page : champ d'accès ci-dessus, pour ouvrir l'administration sans le PIN.</li>
          </ul>
          <div className="flex gap-2 mt-3">
            <code className="flex-1 min-w-0 bg-white/10 border border-white/15 rounded-xl px-3.5 py-3 font-extrabold tracking-wide truncate">{auth.founderCode}</code>
            <button onClick={async () => { try { await navigator.clipboard.writeText(auth.founderCode); setMessage("Code fondateur copié."); } catch { setMessage(auth.founderCode); } }} className="bg-[#F59E0B] text-white font-bold text-sm px-4 rounded-xl flex items-center gap-1.5 shrink-0"><Copy size={15} /> Copier</button>
          </div>
        </section>

        {/* Activations a verifier (controle a posteriori) */}
        <section className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="font-extrabold flex items-center gap-2"><ShieldCheck className="text-[#D97706]" size={18} /> Activations à vérifier — paiements Wave / Orange Money</h2>
            <span className="text-[11px] font-extrabold bg-amber-100 text-amber-800 rounded-full px-2.5 py-1">{activations.filter((a) => a.statut === "active").length} en attente de contrôle</span>
          </div>
          <p className="text-[13px] text-slate-500 mt-1">Crédits déjà débloqués chez le client. Vérifiez le moyen, le montant et la référence dans votre application marchande Wave / Orange Money, puis validez ou rejetez (le rejet annule les crédits).</p>
          <div className="overflow-x-auto mt-4 -mx-1 px-1">
            <table className="w-full text-[13px] min-w-[760px]">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-200">
                  <th className="py-2 pr-3 font-extrabold">Date</th>
                  <th className="py-2 pr-3 font-extrabold">Client (e-mail)</th>
                  <th className="py-2 pr-3 font-extrabold">Offre</th>
                  <th className="py-2 pr-3 font-extrabold">Moyen de paiement</th>
                  <th className="py-2 pr-3 font-extrabold">Référence transaction</th>
                  <th className="py-2 pr-3 font-extrabold">Statut</th>
                  <th className="py-2 font-extrabold">Contrôle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activations.length === 0 && (
                  <tr><td colSpan={7} className="py-5 text-center text-slate-400">Aucune activation enregistrée pour le moment. Les paiements Wave / Orange Money des clients apparaîtront ici.</td></tr>
                )}
                {activations.map((a) => (
                  <tr key={a.id} className="align-top">
                    <td className="py-2.5 pr-3 whitespace-nowrap text-slate-500">{a.createdAt ? new Date(a.createdAt).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : ""}</td>
                    <td className="py-2.5 pr-3"><b className="block">{a.entrepriseNom || a.entrepriseEmail}</b><span className="text-slate-400">{a.entrepriseEmail}</span><span className="block text-slate-400">{a.telephone}</span></td>
                    <td className="py-2.5 pr-3"><b>{a.offreLabel}</b><span className="block text-slate-400 tnum">{new Intl.NumberFormat("fr-FR").format(a.montant)} FCFA</span></td>
                    <td className="py-2.5 pr-3">
                      {a.moyen === "Wave"
                        ? <span className="bg-[#1DC4F2] text-white text-[11px] font-extrabold px-2.5 py-1 rounded-full">WAVE</span>
                        : <span className="bg-[#FF7900] text-white text-[11px] font-extrabold px-2.5 py-1 rounded-full">ORANGE MONEY</span>}
                    </td>
                    <td className="py-2.5 pr-3"><code className="font-bold bg-slate-100 rounded-lg px-2 py-1 break-all">{a.transactionId}</code></td>
                    <td className="py-2.5 pr-3">
                      {a.statut === "active" && <span className="bg-amber-100 text-amber-800 text-[11px] font-extrabold px-2.5 py-1 rounded-full">À VÉRIFIER</span>}
                      {a.statut === "validee" && <span className="bg-emerald-100 text-emerald-700 text-[11px] font-extrabold px-2.5 py-1 rounded-full">VALIDÉ</span>}
                      {a.statut === "rejetee" && <span className="bg-red-100 text-red-700 text-[11px] font-extrabold px-2.5 py-1 rounded-full">REJETÉ — CRÉDITS ANNULÉS</span>}
                    </td>
                    <td className="py-2.5 whitespace-nowrap">
                      {a.statut === "active" ? (
                        <span className="flex gap-1.5">
                          <button disabled={!!busy} onClick={() => decider(a, "valider")} className="bg-emerald-600 text-white text-[12px] font-extrabold px-3 py-2 rounded-lg disabled:opacity-50">Valider</button>
                          <button disabled={!!busy} onClick={() => decider(a, "rejeter")} className="bg-red-600 text-white text-[12px] font-extrabold px-3 py-2 rounded-lg disabled:opacity-50">Rejeter</button>
                        </span>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Synchronisation Supabase */}
        <section className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <span className="bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 w-11 h-11 rounded-2xl grid place-items-center shrink-0"><Database size={20} /></span>
            <div className="flex-1 min-w-0">
              <h2 className="font-extrabold flex items-center gap-2">Synchronisation Supabase</h2>
              <p className="text-[12.5px] text-slate-500 truncate">{sbStatus?.url || "https://…supabase.co"} • clé {sbStatus?.cleMasquee || "non configurée"}</p>
            </div>
            <span className={`text-[11px] font-extrabold px-3 py-1.5 rounded-full ${sbStatus?.ready ? "bg-emerald-100 text-emerald-700" : sbStatus?.reachable ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-700"}`}>
              {sbLoading ? "VÉRIFICATION…" : sbStatus?.ready ? "PRÊT" : sbStatus?.reachable ? "TABLES MANQUANTES" : "HORS LIGNE"}
            </span>
          </div>

          <p className={`text-[12.5px] rounded-xl px-3.5 py-2.5 mt-3 flex items-start gap-2 ${sbStatus?.ready ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-amber-50 text-amber-900 border border-amber-200"}`}>
            {sbStatus?.ready ? <CheckCircle2 size={15} className="shrink-0 mt-0.5" /> : <AlertTriangle size={15} className="shrink-0 mt-0.5" />}
            <span>{sbLoading ? "Connexion à Supabase…" : (sbStatus?.message || "Cliquez sur « Vérifier la connexion ».")}
              {!sbStatus?.ready && <span className="block mt-1">Ouvrez votre projet Supabase → <b>SQL Editor</b> → collez le contenu de <code className="bg-white/70 px-1 rounded">supabase/schema.sql</code> → <b>Run</b>.</span>}
            </span>
          </p>

          {sbStatus?.tables?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {sbStatus.tables.map((t: any) => (
                <span key={t.table} className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${t.existe ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-red-50 text-red-700 ring-1 ring-red-200"}`}>
                  {t.existe ? "✓" : "✕"} {t.table}
                </span>
              ))}
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-2 mt-3.5">
            <button onClick={chargerSupabase} disabled={sbLoading} className="bg-white border-2 border-slate-300 text-slate-700 font-extrabold py-3 rounded-xl flex items-center justify-center gap-2 text-sm disabled:opacity-50">
              <RefreshCw size={16} className={sbLoading ? "animate-spin" : ""} /> Vérifier la connexion
            </button>
            <button onClick={() => synchroniser("all")} disabled={sbSyncing || !sbStatus?.ready} className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3 rounded-xl flex items-center justify-center gap-2 text-sm disabled:opacity-50">
              <Database size={16} className={sbSyncing ? "animate-pulse" : ""} /> {sbSyncing ? "Synchronisation…" : "Synchroniser maintenant"}
            </button>
          </div>
          <button onClick={() => synchroniser("acces")} disabled={sbSyncing || !sbStatus?.ready} className="mt-2 w-full bg-slate-800 text-white font-extrabold py-3 rounded-xl flex items-center justify-center gap-2 text-sm disabled:opacity-50">
            <Crown size={16} /> Publier les accès admin / fondateur dans Supabase
          </button>
          <button onClick={async () => {
            try {
              const r = await fetch("/api/supabase/schema", { headers });
              if (!r.ok) { setMessage("Script SQL inaccessible."); return; }
              const sql = await r.text();
              await navigator.clipboard.writeText(sql);
              setMessage("Script SQL copié. Collez-le dans Supabase → SQL Editor → Run, puis cliquez « Vérifier la connexion ».");
            } catch { setMessage("Copie impossible : ouvrez le fichier supabase/schema.sql du projet."); }
          }} className="mt-2 w-full bg-slate-900 text-white font-extrabold py-3 rounded-xl flex items-center justify-center gap-2 text-sm">
            <Copy size={16} /> Copier le script SQL Supabase
          </button>
          <a href="/api/supabase/schema" target="_blank" rel="noreferrer" className="mt-2 block text-center text-[12px] font-bold text-[#B45309] underline">Ouvrir le script SQL dans un onglet</a>

          {sbResult && (
            <div className="mt-3">
              <p className={`text-[12.5px] font-bold rounded-xl px-3.5 py-2.5 ${sbResult.ok ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>{sbResult.message || sbResult.error}</p>
              {sbResult.resultats && (
                <div className="grid sm:grid-cols-2 gap-1.5 mt-2">
                  {sbResult.resultats.map((r: any) => (
                    <div key={r.table} className={`text-[11.5px] rounded-lg px-2.5 py-1.5 flex items-center justify-between gap-2 ${r.ok ? "bg-slate-50 text-slate-600" : "bg-red-50 text-red-700"}`}>
                      <span className="font-bold">{r.ok ? "✓" : "✕"} {r.table}</span><span className="tnum">{r.synced}/{r.local} lignes</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {sbStatus?.historique?.length > 0 && (
            <p className="text-[11px] text-slate-400 mt-2.5">Dernière synchronisation : {new Date(sbStatus.historique[0].startedAt).toLocaleString("fr-FR")} — {sbStatus.historique[0].statut} · {sbStatus.historique[0].detail?.slice(0, 90)}</p>
          )}
          <p className="text-[11px] text-slate-400 mt-1.5">Les mots de passe et les sessions ne sont jamais copiés vers Supabase. Données synchronisées : comptes, devis, lignes, planning, factures, dépenses, avenants, activations.</p>
        </section>

        {/* Recherche */}
        <section className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
          <h2 className="font-extrabold flex items-center gap-2"><Search className="text-[#D97706]" size={18} /> Rechercher un utilisateur</h2>
          <div className="flex gap-2 mt-3">
            <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()} placeholder="E-mail, nom d'entreprise ou dirigeant…" className="flex-1 min-w-0 border-2 border-slate-200 rounded-2xl px-4 py-3 font-medium outline-none focus:border-[#F59E0B]" />
            <button onClick={search} className="bg-[#0F172A] text-white font-extrabold px-5 rounded-2xl shrink-0">Rechercher</button>
          </div>
          {message && <p className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-sm rounded-xl px-3.5 py-2.5 mt-3 flex items-start gap-2"><CheckCircle2 size={17} className="shrink-0 mt-0.5" /> {message}</p>}

          <div className="space-y-3 mt-4">
            {searched && users.length === 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <p className="font-bold text-sm text-amber-900">Aucun compte avec « {q} ».</p>
                <p className="text-[13px] text-amber-800/70 mt-0.5">Créez le compte avec l'e-mail du client, puis attribuez-lui son offre en un clic.</p>
                <div className="grid sm:grid-cols-2 gap-2 mt-3">
                  <input value={newNom} onChange={(e) => setNewNom(e.target.value)} placeholder="Nom de l'entreprise (optionnel)" className="border rounded-xl px-3.5 py-2.5 font-medium outline-none bg-white" />
                  <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="E-mail du client" className="border rounded-xl px-3.5 py-2.5 font-medium outline-none bg-white" />
                </div>
                <button onClick={createUser} className="mt-2.5 bg-[#F59E0B] text-white font-extrabold px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm"><UserPlus size={16} /> Créer le compte</button>
              </div>
            )}
            {users.map((u) => (
              <article key={u.id} className="border border-slate-200 rounded-2xl p-4 bg-[#F8FAFC]">
                <div className="flex flex-wrap items-start gap-3">
                  <span className="bg-[#0F172A] text-white w-11 h-11 rounded-xl grid place-items-center shrink-0"><Building2 size={19} /></span>
                  <div className="flex-1 min-w-[180px]">
                    <p className="font-extrabold">{u.nom}</p>
                    <p className="text-[13px] text-slate-500">{u.email} • {u.telephone || "tél. non renseigné"} • {u.proprietaire || ""}</p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      {roleBadge(u.role || "client", !!u.bloque)}
                      <span className={`font-extrabold px-2 py-0.5 rounded-full text-[12px] ${u.illimiteActif ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
                        {u.illimiteActif ? "ILLIMITÉ" : `Offre : ${u.plan}`}
                      </span>
                      <span className="font-bold tnum text-[12px] text-slate-600">Crédits : {u.credits === 9999 ? "Illimité" : u.credits}</span>
                    </div>
                    <p className="text-[12px] text-slate-400 mt-1">
                      {u.nbDevis} devis • {new Intl.NumberFormat("fr-FR").format(u.montantDevise || 0)} FCFA devisés
                      {u.illimiteExpireAt ? ` • Illimité jusqu'au ${dateFr(u.illimiteExpireAt)}` : (!u.illimiteExpireAt && u.plan === "illimite" ? " • Illimité permanent" : "")}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3.5">
                  <button disabled={!!busy} onClick={() => activate(u, "unique", "+1 crédit Devis Unique (4 900 FCFA)")} className="bg-white border-2 border-slate-300 font-extrabold text-[13px] py-3 rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-50"><Coins size={15} /> +1 Unique</button>
                  <button disabled={!!busy} onClick={() => activate(u, "pack5", "Pack Pro — 5 crédits (9 900 FCFA)")} className="bg-white border-2 border-amber-400 text-[#B45309] font-extrabold text-[13px] py-3 rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-50"><Coins size={15} /> Pack Pro (5)</button>
                  <button disabled={!!busy} onClick={() => activate(u, "illimite", "Illimité + IA — 30 jours (24 900 FCFA)")} className="bg-[#009A44] text-white font-extrabold text-[13px] py-3 rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-50"><InfinityIcon size={16} /> Illimité 30 j</button>
                  <button disabled={!!busy} onClick={() => activate(u, "fondateur", "Accès fondateur COMPLET et ILLIMITÉ permanent")} className="bg-slate-900 text-white font-extrabold text-[13px] py-3 rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-50"><Crown size={15} /> Fondateur</button>
                </div>

                {/* Contrôle des accès */}
                <div className="mt-2.5 bg-white border border-slate-200 rounded-xl p-3">
                  <p className="text-[11px] font-extrabold text-slate-400">CONTRÔLE DES ACCÈS — RÔLE & SÉCURITÉ</p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <select value={u.role || "client"} disabled={!!busy} onChange={(e) => controler(u, "role", { role: e.target.value })} className="border border-slate-300 rounded-lg px-2.5 py-2 text-[12px] font-bold bg-white disabled:opacity-50">
                      <option value="client">Client</option>
                      <option value="collaborateur">Collaborateur</option>
                      <option value="admin">Administrateur</option>
                      <option value="fondateur">Fondateur</option>
                    </select>
                    {u.bloque ? (
                      <button disabled={!!busy} onClick={() => controler(u, "reactiver")} className="bg-emerald-600 text-white text-[12px] font-extrabold px-3 py-2 rounded-lg disabled:opacity-50">Réactiver l'accès</button>
                    ) : (
                      <button disabled={!!busy} onClick={() => controler(u, "suspendre")} className="bg-red-600 text-white text-[12px] font-extrabold px-3 py-2 rounded-lg disabled:opacity-50">Suspendre l'accès</button>
                    )}
                    <button disabled={!!busy} onClick={() => { const p = prompt(`Nouveau mot de passe pour ${u.email} (8 caractères minimum) :`); if (p) controler(u, "mot_de_passe", { password: p }); }} className="bg-slate-800 text-white text-[12px] font-extrabold px-3 py-2 rounded-lg disabled:opacity-50">Réinitialiser le mot de passe</button>
                    <button disabled={!!busy} onClick={() => controler(u, "supprimer")} className="bg-white border border-red-300 text-red-700 text-[12px] font-extrabold px-3 py-2 rounded-lg disabled:opacity-50">Neutraliser</button>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1.5">Fondateur = accès complet permanent (illimité + administration). Suspendre ferme immédiatement ses sessions.</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm text-sm text-slate-500">
          <h3 className="font-extrabold text-[#0F172A]">Procédure de contrôle des paiements Wave / Orange Money</h3>
          <ol className="list-decimal ml-5 mt-2 space-y-1.5">
            <li>Le client paie sur le lien Wave ou Orange Money de son offre ; ses crédits sont débloqués immédiatement avec l'ID de transaction SMS.</li>
            <li>Dans « Activations à vérifier » ci-dessus, comparez le moyen (Wave / OM), le montant et la référence à votre application marchande.</li>
            <li>Cliquez « Valider » si le paiement est confirmé, ou « Rejeter » en cas de fraude : les crédits débloqués sont alors annulés automatiquement.</li>
            <li>Attribution manuelle possible ci-dessus : recherchez l'e-mail du client et cliquez l'offre correspondante.</li>
          </ol>
        </section>
      </div>
    </main>
  );
}
