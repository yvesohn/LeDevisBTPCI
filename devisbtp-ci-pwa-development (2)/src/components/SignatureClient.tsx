"use client";

import { useEffect, useRef, useState } from "react";
import { Building2, MapPin, CheckCircle2, Eraser, PenLine, ShieldCheck, CalendarDays, FileCheck, Clock } from "lucide-react";
import { fcfa, nombre, dateFr } from "@/lib/format";
import { resumeParLot, resumeParCategorie } from "@/lib/catalogue";

export default function SignatureClient({ token, initialData }: { token: string; initialData?: any }) {
  const [data, setData] = useState<any>(initialData || null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(!initialData);
  const [nom, setNom] = useState("");
  const [accept, setAccept] = useState(false);
  const [signing, setSigning] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [done, setDone] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);

  async function load() {
    try {
      const r = await fetch(`/api/public/${token}`);
      const d = await r.json();
      if (!r.ok) { setError(d.error || "Lien invalide"); return; }
      setData(d); setNom(d.devis.clientNom || "");
    } catch { setError("Connexion impossible. Vérifiez votre réseau puis réessayez."); } finally { setLoading(false); }
  }
  useEffect(() => { if (!initialData) load(); }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data || data.devis.signe || done) return;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      const prev = hasDrawn ? canvas.toDataURL() : null;
      canvas.width = rect.width * ratio; canvas.height = 180 * ratio;
      const ctx = canvas.getContext("2d"); if (!ctx) return;
      ctx.scale(ratio, ratio); ctx.lineWidth = 2.4; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#14231A";
      if (prev) { const img = new Image(); img.onload = () => ctx.drawImage(img, 0, 0, rect.width, 180); img.src = prev; }
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, done]);

  function pos(e: React.PointerEvent) {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }
  function start(e: React.PointerEvent) {
    e.preventDefault(); drawing.current = true; last.current = pos(e);
    canvasRef.current?.setPointerCapture(e.pointerId);
  }
  function move(e: React.PointerEvent) {
    if (!drawing.current || !last.current) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d"); if (!ctx) return;
    const p = pos(e);
    ctx.beginPath(); ctx.moveTo(last.current.x, last.current.y); ctx.lineTo(p.x, p.y); ctx.stroke();
    last.current = p; setHasDrawn(true);
  }
  function end() { drawing.current = false; last.current = null; }
  function clear() {
    const canvas = canvasRef.current; const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  }

  async function signer() {
    if (!hasDrawn) { setError("Signez avec votre doigt dans le cadre blanc ci-dessous."); return; }
    if (nom.trim().length < 2) { setError("Indiquez votre nom complet."); return; }
    if (!accept) { setError("Cochez la case d'acceptation pour valider le devis."); return; }
    setSigning(true); setError("");
    try {
      // Réduit la signature avant envoi (max 640 px de large).
      const src = canvasRef.current!;
      const out = document.createElement("canvas");
      const scale = Math.min(1, 640 / src.width);
      out.width = Math.round(src.width * scale); out.height = Math.round(src.height * scale);
      out.getContext("2d")?.drawImage(src, 0, 0, out.width, out.height);
      const r = await fetch(`/api/public/${token}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nom, signatureData: out.toDataURL("image/png"), acceptation: true }) });
      const d = await r.json();
      if (!r.ok) { setError(d.error || "Signature impossible"); return; }
      setDone(true); await load(); window.scrollTo({ top: 0, behavior: "smooth" });
    } catch { setError("Connexion impossible pendant l'envoi. Réessayez."); } finally { setSigning(false); }
  }

  if (loading) return <div className="min-h-screen bg-[#F1F5F9] grid place-items-center px-6"><p className="font-bold text-slate-500 animate-pulse">Chargement de votre devis…</p></div>;
  if (error && !data) return (
    <div className="min-h-screen bg-[#F1F5F9] grid place-items-center px-5">
      <div className="bg-white rounded-3xl p-7 max-w-sm w-full text-center shadow-sm border">
        <ShieldCheck className="mx-auto text-red-400" size={36} />
        <h1 className="font-extrabold text-lg mt-3">Lien non valide</h1>
        <p className="text-sm text-slate-500 mt-1.5">{error}</p>
      </div>
    </div>
  );

  const { entreprise, devis, lignes, planning, avenants } = data;
  const dejaSigne = devis.signe || done;
  const totalAvenants = (avenants || []).filter((a: any) => a.statut === "signe").reduce((s: number, a: any) => s + a.totalTTC, 0);
  const groups = new Map<string, any[]>();
  lignes.forEach((l: any) => { if (!groups.has(l.section)) groups.set(l.section, []); groups.get(l.section)!.push(l); });
  const totalPlanning = (planning || []).reduce((s: number, e: any) => s + e.dureeJours, 0);

  return (
    <div className="min-h-screen bg-[#F1F5F9] pb-10">
      <header className="bg-[#0F172A] text-white px-4 py-4 sticky top-0 z-10 shadow-lg">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          {entreprise?.logoData ? <img src={entreprise.logoData} alt="" className="w-11 h-11 object-contain bg-white rounded-xl shrink-0" /> : <span className="bg-[#F59E0B] w-11 h-11 rounded-xl grid place-items-center shrink-0"><Building2 size={21} /></span>}
          <div className="min-w-0">
            <p className="font-extrabold truncate">{entreprise?.nom}</p>
            <p className="text-[12px] text-emerald-200/80 truncate">{entreprise?.adresse} • {entreprise?.telephone}</p>
          </div>
          {dejaSigne && <span className="ml-auto bg-emerald-500 text-white text-[11px] font-extrabold px-2.5 py-1.5 rounded-full flex items-center gap-1 shrink-0"><CheckCircle2 size={13} /> SIGNÉ</span>}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-3 sm:px-4 py-4 space-y-4">
        <section className="bg-white rounded-3xl p-5 shadow-sm border">
          <p className="text-xs font-extrabold text-[#B45309]">DEVIS {devis.numero} — {dateFr(devis.createdAt)}</p>
          <h1 className="font-extrabold text-xl leading-tight mt-1.5">Bonjour {devis.clientNom}</h1>
          <p className="text-sm text-slate-600 mt-1 leading-snug">{devis.natureTravaux}</p>
          <p className="text-[13px] text-slate-500 mt-2 flex items-center gap-1"><MapPin size={13} /> Chantier : {devis.lieu}</p>
          {devis.materiauxClient ? (
            <div className="bg-teal-700 text-white rounded-2xl p-4 mt-4">
              <div className="flex items-center justify-between gap-3">
                <div><p className="text-[11px] text-white/65 font-bold">MAIN-D'ŒUVRE À PAYER À L'ENTREPRENEUR</p><p className="font-extrabold text-2xl tnum">{fcfa(devis.moSeuleTTC)}</p></div>
                <div className="text-right"><p className="text-[11px] text-white/65 font-bold">VALIDITÉ</p><p className="font-bold text-sm">{devis.validiteJours} jours</p><p className="text-[11px] text-white/65">jusqu'au {devis.clause.dateExpiration}</p></div>
              </div>
              <p className="text-[12px] text-white/75 mt-2">Mode main-d'œuvre seule : vous fournissez les matériaux listés ci-dessous (quantités sans prix). Valeur totale des travaux si l'entreprise fournissait tout : {fcfa(devis.totalTTC)} TTC, à titre indicatif.</p>
            </div>
          ) : (
            <div className="bg-[#0F172A] text-white rounded-2xl p-4 mt-4 flex items-center justify-between gap-3">
              <div><p className="text-[11px] text-white/60 font-bold">TOTAL TTC DU DEVIS</p><p className="font-extrabold text-2xl">{fcfa(devis.totalTTC)}</p></div>
              <div className="text-right"><p className="text-[11px] text-white/60 font-bold">VALIDITÉ</p><p className="font-bold text-sm">{devis.validiteJours} jours</p><p className="text-[11px] text-white/60">jusqu'au {devis.clause.dateExpiration}</p></div>
            </div>
          )}
          {totalAvenants > 0 && <p className="text-[13px] text-slate-600 mt-3">Avenants déjà validés : <b>{fcfa(totalAvenants)}</b> — nouveau total du chantier : <b>{fcfa(devis.totalTTC + totalAvenants)}</b>.</p>}
        </section>

        {/* Détail selon le format choisi par l'entrepreneur */}
        {devis.materiauxClient ? (
          <section className="bg-white rounded-3xl p-5 shadow-sm border">
            <h2 className="font-extrabold text-sm">Matériaux à fournir par vos soins (quantités, sans prix)</h2>
            <p className="text-[12px] text-slate-400 mt-0.5">Préparez ces matériaux pour le démarrage. Seule la main-d'œuvre vous est facturée.</p>
            <div className="divide-y divide-slate-100 mt-2">
              {(devis.materiauxQuantites || []).map((a: any, i: number) => (
                <div key={i} className="py-2.5 flex justify-between gap-3 text-sm"><span className="font-semibold">{a.designation}</span><b className="tnum whitespace-nowrap">{nombre(a.quantite)} {a.unite}</b></div>
              ))}
            </div>
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 mt-3 flex justify-between text-sm"><span className="font-bold">Main-d'œuvre à payer</span><b className="tnum text-teal-700">{fcfa(devis.moSeuleTTC)} TTC</b></div>
          </section>
        ) : devis.formatPdf === "general" ? (
          <section className="bg-white rounded-3xl p-5 shadow-sm border">
            <h2 className="font-extrabold text-sm">Résumé par grandes étapes</h2>
            <p className="text-[12px] text-slate-400 mt-0.5">Version générale du devis, sans détails techniques.</p>
            <div className="divide-y divide-slate-100 mt-2">
              {resumeParLot(lignes as any).map((r, i) => (
                <div key={r.nom} className="py-2.5 flex items-center gap-3 text-sm">
                  <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 grid place-items-center text-[11px] font-extrabold shrink-0">{i + 1}</span>
                  <span className="flex-1 font-bold">{r.nom}</span><b className="tnum">{fcfa(r.montant)}</b>
                </div>
              ))}
            </div>
          </section>
        ) : devis.formatPdf === "materiaux" ? (
          <section className="bg-white rounded-3xl p-5 shadow-sm border">
            <h2 className="font-extrabold text-sm">Devis par catégories de matériaux</h2>
            <p className="text-[12px] text-slate-400 mt-0.5">Totaux regroupés, sans détail des calculs.</p>
            <div className="divide-y divide-slate-100 mt-2">
              {resumeParCategorie(lignes as any).map((r) => (
                <div key={r.nom} className="py-2.5 flex justify-between gap-3 text-sm">
                  <span className="font-bold">{r.nom}{r.quantite ? <span className="block text-[11px] text-slate-400 font-medium">{nombre(r.quantite)} {r.unite}</span> : null}</span>
                  <b className="tnum">{fcfa(r.montant)}</b>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <section className="space-y-3">
            {Array.from(groups.entries()).map(([section, ls]) => (
              <div key={section} className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                <div className="bg-[#0F172A] text-white px-4 py-2.5 flex justify-between gap-2"><h2 className="font-bold text-[12px] uppercase tracking-wide truncate">{section}</h2><span className="font-bold text-[12px] whitespace-nowrap tnum">{fcfa(ls.reduce((s, l) => s + l.quantite * l.prixUnitaire, 0))}</span></div>
                <div className="divide-y divide-slate-100">
                  {ls.map((l, i) => (
                    <div key={i} className="px-4 py-2.5 flex justify-between gap-3 text-[13px]">
                      <div className="min-w-0"><p className="font-semibold leading-snug">{l.designation}</p>{l.detail ? <p className="text-[11px] text-slate-400 leading-snug mt-0.5">{l.detail}</p> : null}
                        <p className="text-[11px] text-slate-400 mt-0.5 tnum">{nombre(l.quantite)} {l.unite} × {fcfa(l.prixUnitaire)}</p></div>
                      <b className="whitespace-nowrap tnum">{fcfa(l.quantite * l.prixUnitaire)}</b>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </section>
        )}

        {/* Planning */}
        {planning?.length > 0 && (
          <section className="bg-white rounded-3xl p-5 shadow-sm border">
            <h2 className="font-extrabold flex items-center gap-2"><CalendarDays className="text-[#D97706]" size={18} /> Planning estimatif des travaux</h2>
            <div className="mt-3 divide-y divide-slate-100">
              {planning.map((e: any, i: number) => (
                <div key={i} className="py-2.5 flex justify-between gap-3 text-sm">
                  <div className="min-w-0"><p className="font-semibold">{i + 1}. {e.etape}</p>{e.detail && <p className="text-[12px] text-slate-400 leading-snug">{e.detail}</p>}</div>
                  <span className="font-extrabold text-[#0F172A] whitespace-nowrap flex items-center gap-1"><Clock size={13} className="text-slate-400" /> {e.dureeJours} j</span>
                </div>
              ))}
            </div>
            <p className="text-[13px] text-slate-500 mt-3 bg-[#F1F5F9] rounded-xl px-3 py-2.5">Durée totale estimée : <b className="text-slate-800">{totalPlanning} jours ouvrés</b> (environ {Math.ceil(totalPlanning / 5)} semaines), hors aléas météo et délais d'approvisionnement.</p>
          </section>
        )}

        {/* Validité */}
        <section className="bg-amber-50 border border-amber-200 rounded-3xl p-5">
          <h2 className="font-extrabold text-amber-900 text-sm">Conditions de validité des prix</h2>
          <p className="text-[13px] text-amber-900/75 leading-relaxed mt-1.5">{devis.clause.texte}</p>
        </section>

        {/* Signature */}
        {dejaSigne ? (
          <section className="bg-emerald-50 border border-emerald-200 rounded-3xl p-5 text-center">
            <CheckCircle2 className="mx-auto text-emerald-600" size={38} />
            <h2 className="font-extrabold text-lg mt-2">Devis signé électroniquement</h2>
            <p className="text-sm text-emerald-900/70 mt-1">Signé par <b>{devis.signatureClientNom || nom}</b>{devis.signedAt ? ` le ${new Date(devis.signedAt).toLocaleString("fr-FR")}` : ""}.<br />Le chantier est validé — l'entrepreneur va vous contacter pour le démarrage.</p>
            {devis.signatureClientData && <img src={devis.signatureClientData} alt="Signature du client" className="mx-auto mt-3 max-h-20 bg-white border rounded-xl px-3 py-2" />}
          </section>
        ) : (
          <section className="bg-white rounded-3xl p-5 shadow-sm border-2 border-[#F59E0B]/50">
            <h2 className="font-extrabold flex items-center gap-2"><PenLine className="text-[#D97706]" size={19} /> Signer pour valider le chantier</h2>
            <p className="text-[13px] text-slate-500 mt-1">Dessinez votre signature avec le doigt dans le cadre blanc, puis validez. Elle vaut bon pour accord sur {devis.materiauxClient ? `la main-d'œuvre de ${fcfa(devis.moSeuleTTC)} (matériaux fournis par vous)` : `le total de ${fcfa(devis.totalTTC)}`}.</p>
            <label className="block mt-4"><span className="text-xs font-bold text-slate-500">VOTRE NOM COMPLET</span>
              <input value={nom} onChange={(e) => setNom(e.target.value)} className="w-full border-2 border-slate-200 rounded-2xl px-4 py-3 mt-1 font-semibold outline-none focus:border-[#F59E0B]" placeholder="Nom et prénoms" /></label>
            <div className="mt-4">
              <div className="flex items-center justify-between"><span className="text-xs font-bold text-slate-500">VOTRE SIGNATURE (AU DOIGT)</span>
                <button onClick={clear} className="text-xs font-bold text-slate-500 flex items-center gap-1 bg-slate-100 px-2.5 py-1.5 rounded-lg"><Eraser size={13} /> Effacer</button></div>
              <div className="relative mt-1.5">
                <canvas ref={canvasRef} onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerLeave={end}
                  className="w-full h-[180px] bg-white border-2 border-dashed border-slate-300 rounded-2xl touch-none cursor-crosshair" />
                {!hasDrawn && <p className="absolute inset-0 grid place-items-center text-slate-300 font-semibold pointer-events-none text-sm">Signez ici avec votre doigt</p>}
              </div>
            </div>
            <label className="flex gap-2.5 mt-4 bg-[#F1F5F9] rounded-xl p-3 cursor-pointer">
              <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} className="mt-0.5 w-5 h-5 accent-[#F59E0B] shrink-0" />
              <span className="text-[13px] text-slate-600 leading-snug">Je reconnais avoir lu le devis {devis.numero} d'un montant de <b>{fcfa(devis.materiauxClient ? devis.moSeuleTTC : devis.totalTTC)}</b>{devis.materiauxClient ? " (main-d'œuvre seule, matériaux fournis par mes soins)" : ""}, j'accepte les travaux et les conditions de validité ci-dessus. <b>Bon pour accord.</b></span>
            </label>
            {error && <p className="bg-red-50 text-red-700 border border-red-200 text-sm rounded-xl px-3.5 py-2.5 mt-3">{error}</p>}
            <button onClick={signer} disabled={signing} className="mt-4 w-full bg-[#009A44] hover:bg-[#007F38] disabled:opacity-60 text-white font-extrabold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-200">
              <FileCheck size={19} /> {signing ? "Envoi de la signature…" : "Signer et valider le chantier"}
            </button>
            <p className="text-[11px] text-slate-400 text-center mt-2.5 flex items-center justify-center gap-1"><ShieldCheck size={12} /> Signature horodatée et conservée par {entreprise?.nom}.</p>
          </section>
        )}

        <p className="text-center text-[11px] text-slate-400 px-4">
          {[entreprise?.nom, entreprise?.rccm ? `RCCM : ${entreprise.rccm}` : "", entreprise?.compteContribuable ? `CC : ${entreprise.compteContribuable}` : ""].filter(Boolean).join(" • ")}
        </p>
      </main>
    </div>
  );
}
