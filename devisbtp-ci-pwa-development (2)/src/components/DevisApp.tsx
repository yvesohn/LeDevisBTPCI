"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Building2, Home, Plus, FileText, CreditCard, Sparkles, Camera, Upload, MapPin, User,
  Phone, Ruler, Layers, Trash2, Download, MessageCircle, Check, CheckCircle2, Wallet,
  Coins, TrendingUp, Clock, Search, X, ChevronRight, HardHat, Hammer, PaintBucket,
  Zap, ShieldCheck, Star, ArrowLeft, Save, Printer, Share2, BadgeCheck, Landmark,
  Calculator, Eye, FileCheck, Smartphone, WifiOff, Bell, Menu,
  Receipt, ShoppingCart, Copy, Lock, Stamp, PenLine, ImagePlus, EyeOff, Percent, CalendarDays, Link2, Users, Timer, FilePlus2, Send, Tag, ArrowRight, ArrowLeft as ArrowLeftIcon, LayoutTemplate, LogOut, Mail, Crown, UserPlus
} from "lucide-react";
import AuthScreen from "@/components/AuthScreen";
import { installFetchAuth, setToken, clearToken, getToken } from "@/lib/clientAuth";

/** Version de l'interface : permet de vérifier que le navigateur n'affiche pas une ancienne copie. */
const APP_VERSION = "2026.11.12-3";
import { CATALOGUE_CI, NORMES_CI, PRIX_DEFAUT, LIGNE_MAIN_OEUVRE, estLigneMainOeuvre, prixAvecMarge, listeAchatsMateriaux, clauseValidite, suggererLignesAvenant, montantEquipe, detailEquipe, EQUIPE_DEFAUT, FORMATS_PDF, resumeParLot, resumeParCategorie, type FormatPdf } from "@/lib/catalogue";
import { fcfa, nombre, dateFr } from "@/lib/format";
import { genererPdfDevis, genererPdfFacture, genererPdfAvenant, formatPapierInfo, type FormatPapier } from "@/lib/pdf";
import { creerLienWhatsApp, normaliserNumeroWhatsApp } from "@/lib/whatsapp";

const MO_NAME = LIGNE_MAIN_OEUVRE;
function materiauxTotal(lignes: Ligne[]) {
  return lignes.filter((l) => !estLigneMainOeuvre(l)).reduce((s, l) => s + (Number(l.quantite) || 0) * (Number(l.prixUnitaire) || 0), 0);
}
function syncMainOeuvre(lignes: Ligne[], pct: number): Ligne[] {
  const base = materiauxTotal(lignes);
  const montant = Math.round((base * pct) / 100);
  const detail = `${pct} % du total des matériaux (${new Intl.NumberFormat("fr-FR").format(Math.round(base))} FCFA) — pourcentage ajustable`;
  if (!lignes.some((l) => estLigneMainOeuvre(l))) {
    return [...lignes, { section: "Main-d'œuvre", designation: MO_NAME, detail, unite: "forfait", quantite: 1, prixUnitaire: montant }];
  }
  return lignes.map((l) => (estLigneMainOeuvre(l) ? { ...l, section: "Main-d'œuvre", quantite: 1, unite: "forfait", prixUnitaire: montant, detail } : l));
}

/** Lignes côté client : marge secrète appliquée aux prix unitaires, main-d'œuvre recalculée. Jamais de mention de la marge. */
function lignesClientLocal(lignes: Ligne[], margePct: number, moPct: number): Ligne[] {
  const majorees = lignes.map((l) => (estLigneMainOeuvre(l) ? l : { ...l, prixUnitaire: prixAvecMarge(l.prixUnitaire, margePct) }));
  return syncMainOeuvre(majorees, moPct);
}

function syncMoMontant(lignes: Ligne[], montant: number, detail: string): Ligne[] {
  const sans = lignes.filter((l) => !estLigneMainOeuvre(l));
  return [...sans, { section: "Main-d'œuvre", designation: MO_NAME, detail, unite: "forfait", quantite: 1, prixUnitaire: Math.round(montant) }];
}
function syncMoMode(lignes: Ligne[], mode: string, pct: number, equipe: any): Ligne[] {
  if (mode === "equipe") return syncMoMontant(lignes, montantEquipe(equipe), detailEquipe(equipe));
  return syncMainOeuvre(lignes, pct);
}
function lignesClientMode(lignes: Ligne[], margePct: number, moPct: number, mode: string, equipe: any): Ligne[] {
  const majorees = lignes.map((l) => (estLigneMainOeuvre(l) ? l : { ...l, prixUnitaire: prixAvecMarge(l.prixUnitaire, margePct) }));
  if (mode === "equipe") return syncMoMontant(majorees, prixAvecMarge(montantEquipe(equipe), margePct), detailEquipe(equipe));
  return syncMainOeuvre(majorees, moPct);
}

/** Compresse une image (logo / signature / cachet) pour la stocker et l'imprimer dans les PDF. */
function traiterImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const max = 420;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) { URL.revokeObjectURL(url); reject(new Error("canvas")); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL(file.type === "image/png" ? "image/png" : "image/jpeg", 0.85));
    };
    img.onerror = reject;
    img.src = url;
  });
}

type Tab = "accueil" | "nouveau" | "devis" | "prix" | "entreprise";
type Ligne = { id?: number; section: string; designation: string; detail?: string; unite: string; quantite: number; prixUnitaire: number };
type Devis = any;
type Entreprise = any;

const LIEUX = ["Abidjan, Cocody","Abidjan, Plateau","Abidjan, Yopougon","Abidjan, Abobo","Abidjan, Treichville","Abidjan, Marcory","Abidjan, Bingerville","Abidjan, Songon","Grand-Bassam","Yamoussoukro","Bouaké","San-Pédro","Korhogo","Man","Autre ville / village"];
const TEMPLATES = [
  { label: "Villa R+1", text: "Construction villa duplex R+1, 5 pièces, séjour double hauteur, cuisine américaine, 3 salles de bain, terrasse" },
  { label: "Villa plain-pied", text: "Construction villa basse plain-pied, 4 pièces, séjour + salle à manger, 2 salles de bain, garage 1 voiture" },
  { label: "Clôture + portail", text: "Clôture de terrain avec portail métallique, hauteur 2,10 m, poteaux raidisseurs, enduit 2 faces" },
  { label: "Dalle / Dallage", text: "Coulage dalle béton armé et dallage extérieur, finition talochée, joints de dilatation" },
  { label: "Rénovation", text: "Rénovation complète appartement : reprise enduits, peinture, carrelage séjour et pièces humides, plomberie et électricité" },
  { label: "Extension", text: "Extension maison existante : 2 chambres + salle de bain, reprise toiture, raccordement réseaux" },
];
const STATUT: Record<string, { label: string; cls: string; dot: string }> = {
  brouillon: { label: "Brouillon", cls: "bg-slate-100 text-slate-600 ring-1 ring-slate-200", dot: "bg-slate-400" },
  pret: { label: "Prêt à envoyer", cls: "bg-sky-50 text-sky-700 ring-1 ring-sky-200", dot: "bg-sky-500" },
  envoye: { label: "Envoyé", cls: "bg-amber-50 text-amber-700 ring-1 ring-amber-200", dot: "bg-amber-500" },
  signe: { label: "Validé", cls: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200", dot: "bg-emerald-500" },
};
export const OFFRES_PAIEMENT: Record<string, { label: string; montant: number; creditsLabel: string; wave: string; orangeMoney: string }> = {
  unique: {
    label: "Devis Unique", montant: 4900, creditsLabel: "1 devis",
    wave: "https://pay.wave.com/m/M_ci_-Wj-BfYYcOBC/c/ci/?amount=4900",
    orangeMoney: "https://multi.app.orange-money.com/app/v1/kapptivate/qrcode/odyssee/?id=codgen25-b20eb838a6aa4360b2e4d23428ab8a87&v=1&amount=4900",
  },
  pack5: {
    label: "Pack Pro (5 devis / mois)", montant: 9900, creditsLabel: "5 devis",
    wave: "https://pay.wave.com/m/M_ci_-Wj-BfYYcOBC/c/ci/?amount=9900",
    orangeMoney: "https://multi.app.orange-money.com/app/v1/kapptivate/qrcode/odyssee/?id=codgen25-b20eb838a6aa4360b2e4d23428ab8a87&v=1&amount=9900",
  },
  illimite: {
    label: "Illimité + Plan IA (30 jours)", montant: 24900, creditsLabel: "Devis illimités + analyse plan IA (30 jours)",
    wave: "https://pay.wave.com/m/M_ci_-Wj-BfYYcOBC/c/ci/?amount=24900",
    orangeMoney: "https://multi.app.orange-money.com/app/v1/kapptivate/qrcode/odyssee/?id=codgen25-b20eb838a6aa4360b2e4d23428ab8a87&v=1&amount=24900",
  },
};

const HERO = "https://images.pexels.com/photos/30661412/pexels-photo-30661412.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200";
const IMG2 = "https://images.pexels.com/photos/2219024/pexels-photo-2219024.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200";

export default function DevisApp({ initialCompte = null, initialDevis = [], initialStats = null, initialToken = null }: { initialCompte?: any; initialDevis?: any[]; initialStats?: any; initialToken?: string | null }) {
  const [tab, setTab] = useState<Tab>("accueil");
  const [entreprise, setEntreprise] = useState<Entreprise>(initialCompte);
  const [devisList, setDevisList] = useState<Devis[]>(initialDevis);
  const [stats, setStats] = useState<any>(initialStats);
  // Premier rendu fourni par le serveur : aucun écran de chargement bloquant.
  const [loading, setLoading] = useState(false);
  const [authChecked, setAuthChecked] = useState(true);
  const [compte, setCompte] = useState<any>(initialCompte);
  const [toast, setToast] = useState("");
  const [showCatalogue, setShowCatalogue] = useState(false);
  const [search, setSearch] = useState("");
  const [filtreStatut, setFiltreStatut] = useState("tous");
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [serveurInjoignable, setServeurInjoignable] = useState(false);

  // Formulaire création (tunnel en 3 étapes)
  const [createStep, setCreateStep] = useState(1);
  const [form, setForm] = useState({ clientNom: "", clientTel: "", lieu: "Abidjan, Cocody", natureTravaux: "", surface: 120, nbPieces: 4, nbEtages: 1 });
  const [photo, setPhoto] = useState<{ name: string; size: string; url: string } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<null | { titre: string; message: string; code?: string }>(null);
  const [reconnexion, setReconnexion] = useState<null | { enCours: boolean; email: string }>(null);
  const [reconnexionPwd, setReconnexionPwd] = useState("");
  const [diag, setDiag] = useState<null | { statut: "encours" | "termine"; lignes: { label: string; ok: boolean; detail: string }[] }>(null);
  const [genStep, setGenStep] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  // Paramètres métier CI (formulaire de création)
  const [prixPerso, setPrixPerso] = useState({ ...PRIX_DEFAUT });
  const [moCreatePct, setMoCreatePct] = useState(NORMES_CI.mainOeuvrePctDefaut);
  const [margeCreatePct, setMargeCreatePct] = useState(0);
  const [showNormes, setShowNormes] = useState(false);

  // Profil entreprise
  const [profilForm, setProfilForm] = useState<any>(null);
  const [savingProfil, setSavingProfil] = useState(false);

  // Éditeur
  const [editor, setEditor] = useState<{ devis: Devis; lignes: Ligne[] } | null>(null);
  const [tvaPct, setTvaPct] = useState(18);
  const [remisePct, setRemisePct] = useState(0);
  const [mainOeuvrePct, setMainOeuvrePct] = useState(NORMES_CI.mainOeuvrePctDefaut);
  const [margePct, setMargePct] = useState(0);
  const [formatPdf, setFormatPdf] = useState<FormatPdf>("general");
  const [formatDefaut, setFormatDefaut] = useState<FormatPdf>("general");
  const [formatPapier, setFormatPapier] = useState<FormatPapier>("A4");
  const [pdfApercu, setPdfApercu] = useState<null | { url: string; nom: string }>(null);
  // Destinataire WhatsApp : saisie libre, contacts du téléphone ou carnet enregistré.
  const [waModal, setWaModal] = useState<null | { titre: string; texte: string; tel: string; nom?: string }>(null);
  const [waTel, setWaTel] = useState("");
  const [waCarnet, setWaCarnet] = useState<{ nom: string; tel: string }[]>([]);
  const [waNouveau, setWaNouveau] = useState({ nom: "", tel: "" });
  const [waErreur, setWaErreur] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [savingFormat, setSavingFormat] = useState(false);
  const [materiauxClient, setMateriauxClient] = useState(false);
  const [materiauxCreate, setMateriauxCreate] = useState(false);
  const [editorTab, setEditorTab] = useState<"devis" | "depenses">("devis");
  const [depenses, setDepenses] = useState<any[]>([]);
  const [depenseForm, setDepenseForm] = useState({ libelle: "", montant: "", dateDepense: "" });
  const [saving, setSaving] = useState(false);
  const [factures, setFactures] = useState<any[]>([]);

  // Planning, validité, simulateur d'équipe, avenants, signature client
  const [validiteCreate, setValiditeCreate] = useState(30);
  const [moCreateMode, setMoCreateMode] = useState<"pct" | "equipe">("pct");
  const [equipeCreate, setEquipeCreate] = useState({ ...EQUIPE_DEFAUT });
  const [validiteJours, setValiditeJours] = useState(30);
  const [moMode, setMoMode] = useState<"pct" | "equipe">("pct");
  const [equipe, setEquipe] = useState({ ...EQUIPE_DEFAUT });
  const [planning, setPlanning] = useState<any[]>([]);
  const [avenants, setAvenants] = useState<any[]>([]);
  const [avenantModal, setAvenantModal] = useState<{ devis: Devis; avenant?: any } | null>(null);
  const [avForm, setAvForm] = useState({ titre: "Travaux supplémentaires", description: "", statut: "brouillon" });
  const [avLignes, setAvLignes] = useState<Ligne[]>([]);
  const [shareUrl, setShareUrl] = useState("");

  // Liste d'achats & factures d'acompte
  const [achatsModal, setAchatsModal] = useState<{ devis: Devis; lignes: Ligne[] } | null>(null);
  const [fournisseurTel, setFournisseurTel] = useState("");
  const [acompteModal, setAcompteModal] = useState<{ devis: Devis } | null>(null);
  const [acomptePct, setAcomptePct] = useState(30);
  const [acompteCustom, setAcompteCustom] = useState("");
  const [derniereFacture, setDerniereFacture] = useState<any>(null);
  const [acompteError, setAcompteError] = useState("");
  const [creatingFacture, setCreatingFacture] = useState(false);
  const [newLine, setNewLine] = useState({ section: "Divers", designation: "", quantite: 1, prixUnitaire: 0, unite: "u" });

  // Paiement
  const [activationModal, setActivationModal] = useState<null | { offre: string; moyen: "Wave" | "Orange Money" }>(null);
  const [activationForm, setActivationForm] = useState({ transactionId: "", telephone: "" });
  const [activationDone, setActivationDone] = useState<any>(null);
  const [activationError, setActivationError] = useState("");
  const [activating, setActivating] = useState(false);
  const [codeFondateur, setCodeFondateur] = useState("");

  const credits = entreprise ? (entreprise.plan === "illimite" ? Infinity : entreprise.credits) : 1;
  const creditsLabel = credits === Infinity ? "Illimité" : `${credits} crédit${credits > 1 ? "s" : ""}`;

  function showToast(m: string) { setToast(m); setTimeout(() => setToast(""), 4200); }

  // Charge le carnet de contacts enregistré sur l'appareil.
  useEffect(() => {
    try {
      const brut = localStorage.getItem("dbtp_contacts");
      const contacts = brut ? JSON.parse(brut) : [];
      if (Array.isArray(contacts)) {
        setWaCarnet(contacts.filter((contact) => contact && typeof contact.nom === "string" && typeof contact.tel === "string").slice(0, 50));
      }
    } catch { /* stockage indisponible ou ancien carnet invalide */ }
  }, []);

  function enregistrerCarnet(liste: { nom: string; tel: string }[]) {
    setWaCarnet(liste);
    try { localStorage.setItem("dbtp_contacts", JSON.stringify(liste)); } catch { /* ignore */ }
  }

  /** Ouvre le sélecteur de contacts du téléphone (Android/Chrome) ; repli sur le carnet enregistré. */
  async function choisirContactTelephone() {
    const nav = navigator as any;
    if (!nav.contacts?.select) {
      setWaErreur("Le sélecteur de contacts n'est pas disponible sur ce navigateur. Saisissez le numéro ou utilisez le carnet ci-dessous.");
      return;
    }
    try {
      const res = await nav.contacts.select(["name", "tel"], { multiple: false });
      const c = res?.[0];
      const numero = c?.tel?.[0] || "";
      if (!numero) { setWaErreur("Aucun numéro sélectionné."); return; }
      const normalise = normaliserNumeroWhatsApp(numero);
      if (!normalise.valide || normalise.vide) {
        setWaErreur(normalise.valide ? "Ce contact ne contient pas de numéro." : normalise.erreur);
        return;
      }
      setWaTel(numero);
      const nom = c?.name?.[0] || "";
      const dejaEnregistre = waCarnet.some((contact) => {
        const existant = normaliserNumeroWhatsApp(contact.tel);
        return existant.valide && existant.numero === normalise.numero;
      });
      if (nom && !dejaEnregistre) {
        enregistrerCarnet([{ nom, tel: numero }, ...waCarnet].slice(0, 50));
      }
      setWaErreur("");
      showToast(`Contact sélectionné : ${nom || numero}`);
    } catch { setWaErreur("Sélection de contact annulée."); }
  }

  /** Prépare l'envoi WhatsApp : affiche la fenêtre avec le numéro du destinataire. */
  function demanderDestinataire(opts: { titre: string; texte: string; tel?: string; nom?: string }) {
    setWaErreur("");
    setWaTel(opts.tel || "");
    setWaModal({ titre: opts.titre, texte: opts.texte, tel: opts.tel || "", nom: opts.nom });
  }

  /** Valide le destinataire avant de laisser le navigateur ouvrir le lien natif wa.me. */
  function preparerEnvoiWhatsApp(telChoisi?: string): boolean {
    if (!waModal) return false;
    const tel = (telChoisi ?? waTel).trim();
    const resultat = normaliserNumeroWhatsApp(tel);
    if (!resultat.valide) {
      setWaErreur(resultat.erreur);
      return false;
    }
    setWaErreur("");

    // Un numéro vide sert uniquement à choisir le destinataire dans WhatsApp ;
    // il ne doit jamais créer un contact vide dans le carnet.
    if (!resultat.vide) {
      const dejaEnregistre = waCarnet.some((contact) => {
        const numero = normaliserNumeroWhatsApp(contact.tel);
        return numero.valide && numero.numero === resultat.numero;
      });
      if (!dejaEnregistre) {
        const numeroInitial = normaliserNumeroWhatsApp(waModal.tel);
        const memeDestinataire = numeroInitial.valide && numeroInitial.numero === resultat.numero;
        const nom = memeDestinataire && waModal.nom ? waModal.nom : `Contact ${resultat.numero.slice(-4)}`;
        enregistrerCarnet([{ nom, tel }, ...waCarnet].slice(0, 50));
      }
    }
    showToast("WhatsApp s'ouvre avec votre message. Vérifiez le destinataire avant l'envoi.");
    return true;
  }

  async function copierTexteWhatsApp(texte: string): Promise<boolean> {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(texte);
        return true;
      }
    } catch { /* repli ci-dessous */ }
    try {
      const champ = document.createElement("textarea");
      champ.value = texte;
      champ.style.position = "fixed";
      champ.style.opacity = "0";
      document.body.appendChild(champ);
      champ.focus(); champ.select();
      const copie = document.execCommand("copy");
      document.body.removeChild(champ);
      return copie;
    } catch {
      return false;
    }
  }

  async function copierMessageWhatsApp() {
    if (!waModal) return;
    const copie = await copierTexteWhatsApp(waModal.texte);
    showToast(copie ? "Message copié — collez-le dans la conversation WhatsApp." : "Copie impossible : utilisez l'aperçu du message pour le sélectionner.");
  }

  async function copierLienWhatsApp() {
    if (!waModal) return;
    const lien = creerLienWhatsApp(waTel, waModal.texte);
    if (!lien) {
      const numero = normaliserNumeroWhatsApp(waTel);
      if (!numero.valide) setWaErreur(numero.erreur);
      return;
    }
    const copie = await copierTexteWhatsApp(lien);
    showToast(copie ? "Lien WhatsApp copié." : "Copie du lien impossible sur ce navigateur.");
  }

  useEffect(() => {
    if (tab === "entreprise" && entreprise && !profilForm) setProfilForm({ ...entreprise });
  }, [tab, entreprise, profilForm]);

  useEffect(() => {
    try { const saved = localStorage.getItem("devisbtp-prix"); if (saved) setPrixPerso({ ...PRIX_DEFAUT, ...JSON.parse(saved) }); } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    try { localStorage.setItem("devisbtp-prix", JSON.stringify(prixPerso)); } catch { /* ignore */ }
  }, [prixPerso]);

  function goNouveau() { setCreateStep(1); setTab("nouveau"); window.scrollTo({ top: 0 }); }

  async function loadDashboard() {
    try {
      const r = await fetchAvecRecuperation("/api/dashboard");
      if (r.ok) setServeurInjoignable(false);
      if (r.status === 401) {
        // Session expirée : on ne vide l'écran que si aucun jeton de secours n'est disponible.
        let token = "";
        try { token = localStorage.getItem("dbtp_token") || ""; } catch { /* storage bloqué */ }
        if (!token) { setCompte(null); setEntreprise(null); setDevisList([]); }
        return;
      }
      const d = await r.json();
      setCompte(d.entreprise); setEntreprise(d.entreprise); setDevisList(d.devis || []); setStats(d.stats);
    } catch { setServeurInjoignable(true); } finally { setLoading(false); setAuthChecked(true); }
  }

  async function seDeconnecter() {
    if (!confirm("Se déconnecter de votre compte ?")) return;
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    clearToken();
    setCompte(null); setEntreprise(null); setDevisList([]); setStats(null); setEditor(null); setTab("accueil");
    showToast("Vous êtes déconnecté.");
  }

  useEffect(() => {
    const f = (compte?.formatPdfDefaut as FormatPdf) || "general";
    setFormatDefaut(f);
    setFormatPdf(f);
  }, [compte?.formatPdfDefaut]);

  async function enregistrerFormatDefaut(f: FormatPdf) {
    setFormatDefaut(f); setSavingFormat(true);
    try {
      const r = await fetchAvecRecuperation("/api/entreprise", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ formatPdfDefaut: f }) });
      const d = await r.json();
      if (!r.ok) { showToast(d.error || "Enregistrement impossible"); return; }
      setEntreprise(d.entreprise); setCompte(d.entreprise);
      showToast(`Format par défaut : ${f === "general" ? "Option A — Devis Général (recommandé client)" : f === "materiaux" ? "Option B — Par Matériaux" : "Option C — DQE Complet"}.`);
    } finally { setSavingFormat(false); }
  }

  function apresConnexion(c: any, token?: string) {
    installFetchAuth();
    if (token) setToken(token);
    setCompte(c); setEntreprise(c); setPrixPerso({ ...PRIX_DEFAUT }); setTab("accueil"); setLoading(true); setAuthChecked(true);
    loadDashboard();
    showToast(`Bienvenue ${c.proprietaire || c.nom} !`);
  }
  // Détecte une nouvelle version déployée et recharge l'application (évite les anciens scripts en cache).
  useEffect(() => {
    let versionInitiale = "";
    const verifier = async () => {
      try {
        const r = await fetch("/api/health", { cache: "no-store" });
        const d = await r.json();
        const v = String(d.version || "");
        if (!v) return;
        if (!versionInitiale) { versionInitiale = v; return; }
        if (v !== versionInitiale) window.location.reload();
      } catch { /* hors ligne */ }
    };
    const t = setInterval(verifier, 60000);
    verifier();
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => reg?.update().catch(() => undefined)).catch(() => undefined);
    }
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (initialToken) setToken(initialToken);
    installFetchAuth();
    if (initialCompte) { loadDashboard(); return; }
    setLoading(false);
    // Aucune session serveur (cookies absents ou bloqués) : on restaure la session locale
    // AVANT d'afficher l'écran de connexion, pour éviter tout aller-retour inutile.
    const local = getToken();
    const parametreOnglet = new URLSearchParams(window.location.search).get("tab");
    const appliquerOnglet = () => {
      if (parametreOnglet === "devis" || parametreOnglet === "prix" || parametreOnglet === "entreprise" || parametreOnglet === "nouveau") setTab(parametreOnglet);
    };
    if (!local) { setAuthChecked(true); appliquerOnglet(); return; }
    setAuthChecked(false);
    fetch(`/api/auth/session?token=${encodeURIComponent(local)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d?.compte) { clearToken(); return; }
        if (d.token) setToken(d.token);
        setCompte(d.compte); setEntreprise(d.compte); appliquerOnglet(); loadDashboard();
      })
      .catch(() => undefined)
      .finally(() => setAuthChecked(true));
    const t = new URLSearchParams(window.location.search).get("tab");
    if (t === "nouveau" || t === "devis" || t === "entreprise") setTab(t);
    if (t === "prix" || t === "tarifs") setTab("prix");
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
    const onInstall = (e: any) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener("beforeinstallprompt", onInstall);
    const onOnline = () => setIsOnline(true); const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline); window.addEventListener("offline", onOffline);
    setIsOnline(navigator.onLine);
    return () => { window.removeEventListener("beforeinstallprompt", onInstall); window.removeEventListener("online", onOnline); window.removeEventListener("offline", onOffline); };
  }, []);

  const totauxEditor = useMemo(() => {
    const vide = { materiauxBase: 0, materiaux: 0, moBase: 0, mo: 0, montantMarge: 0, htBase: 0, htBrut: 0, remise: 0, ht: 0, tva: 0, ttc: 0, moSeuleHT: 0, moSeuleTTC: 0 };
    if (!editor) return vide;
    const materiauxBase = materiauxTotal(editor.lignes);
    const materiaux = editor.lignes.filter((l) => !estLigneMainOeuvre(l)).reduce((s, l) => s + (Number(l.quantite) || 0) * prixAvecMarge(l.prixUnitaire, margePct), 0);
    const moBase = moMode === "equipe" ? montantEquipe(equipe) : Math.round((materiauxBase * mainOeuvrePct) / 100);
    const mo = moMode === "equipe" ? prixAvecMarge(montantEquipe(equipe), margePct) : Math.round((materiaux * mainOeuvrePct) / 100);
    const htBase = materiauxBase + moBase;
    const htBrut = materiaux + mo;
    const remise = htBrut * remisePct / 100; const ht = htBrut - remise; const tva = ht * tvaPct / 100;
    const moSeuleHT = Math.max(0, mo - (htBrut ? (remise * mo) / htBrut : 0));
    const moSeuleTTC = moSeuleHT * (1 + tvaPct / 100);
    return { materiauxBase, materiaux, moBase, mo, montantMarge: htBrut - htBase, htBase, htBrut, remise, ht, tva, ttc: ht + tva, moSeuleHT, moSeuleTTC };
  }, [editor, tvaPct, remisePct, mainOeuvrePct, margePct, moMode, equipe]);

  function updateEditorLignes(lignes: Ligne[]) {
    if (!editor) return;
    setEditor({ ...editor, lignes: syncMoMode(lignes, moMode, mainOeuvrePct, equipe) });
  }
  function changeMainOeuvrePct(v: number) {
    const pct = Math.min(100, Math.max(0, Number.isFinite(v) ? v : 0));
    setMainOeuvrePct(pct);
    if (editor) setEditor({ ...editor, lignes: syncMoMode(editor.lignes, moMode, pct, equipe) });
  }
  function changeMoMode(mode: "pct" | "equipe") {
    setMoMode(mode);
    if (editor) setEditor({ ...editor, lignes: syncMoMode(editor.lignes, mode, mainOeuvrePct, equipe) });
  }
  function changeEquipe(patch: Partial<typeof equipe>) {
    const next = { ...equipe, ...patch };
    setEquipe(next);
    if (editor && moMode === "equipe") setEditor({ ...editor, lignes: syncMoMode(editor.lignes, "equipe", mainOeuvrePct, next) });
  }

  const totalPlanning = useMemo(() => planning.reduce((s, e) => s + (Number(e.dureeJours) || 0), 0), [planning]);
  const equipeDuDevis = (d: Devis) => ({ macons: d?.moMacons ?? EQUIPE_DEFAUT.macons, manoeuvres: d?.moManoeuvres ?? EQUIPE_DEFAUT.manoeuvres, jours: d?.moJours ?? EQUIPE_DEFAUT.jours, tauxMacon: d?.moTauxMacon ?? 7000, tauxManoeuvre: d?.moTauxManoeuvre ?? 4000 });

  const sectionsEditor = useMemo(() => {
    if (!editor) return [] as [string, Ligne[]][];
    const map = new Map<string, Ligne[]>();
    editor.lignes.forEach(l => { if (!map.has(l.section)) map.set(l.section, []); map.get(l.section)!.push(l); });
    return Array.from(map.entries());
  }, [editor]);

  async function handlePhoto(file: File) {
    const url = URL.createObjectURL(file);
    const size = file.size > 1024 * 1024 ? `${(file.size / 1024 / 1024).toFixed(1)} Mo` : `${Math.round(file.size / 1024)} Ko`;
    setPhoto({ name: file.name, size, url });
    showToast("Plan ajouté — il sera analysé par l'IA lors de la génération.");
  }

  /** Rejoue une requête une fois avec un jeton resynchronisé (session valide côté cookie). */
  async function fetchAvecRecuperation(url: string, init?: RequestInit): Promise<Response> {
    let res = await fetch(url, init);
    if (res.status !== 401) return res;
    try {
      const sync = await fetch(`/api/auth/session?token=${encodeURIComponent(getToken())}`, { cache: "no-store" });
      if (sync.ok) {
        const d = await sync.json();
        if (d?.token) { setToken(d.token); res = await fetch(url, init); }
      }
    } catch { /* réseau : on renvoie la réponse 401 initiale */ }
    return res;
  }

  /** Reconnexion rapide : rouvre une session puis relance la génération automatiquement. */
  async function reconnexionEtRelance() {
    if (!reconnexion || reconnexionPwd.length < 4) { showToast("Saisissez votre mot de passe."); return; }
    try {
      const r = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: reconnexion.email, password: reconnexionPwd }) });
      const d = await r.json();
      if (!r.ok) { showToast(d.error || "Connexion impossible."); return; }
      if (d.token) setToken(d.token);
      setCompte(d.compte); setEntreprise(d.compte);
      setReconnexion(null); setReconnexionPwd(""); setGenError(null);
      showToast("Session rétablie — génération du devis…");
      setTimeout(() => { generateDevis(); }, 300);
    } catch { showToast("Connexion au serveur impossible."); }
  }

  function erreurGeneration(titre: string, message: string, code?: string) {
    setGenError({ titre, message, code });
    showToast(message);
  }

  async function generateDevis() {
    setGenError(null);
    if (!form.clientNom.trim()) { erreurGeneration("Nom du client manquant", "Indiquez le nom du client pour générer le devis.", "FORM"); setCreateStep(1); return; }
    // Une photo de plan suffit : on complète alors la description automatiquement.
    const natureTravaux = form.natureTravaux.trim() || (photo ? "Travaux de construction à réaliser selon le plan joint" : "");
    if (!natureTravaux) { erreurGeneration("Travaux non renseignés", "Décrivez les travaux en quelques mots, ou ajoutez la photo du plan.", "FORM"); setCreateStep(2); return; }
    if (credits !== Infinity && credits <= 0) {
      erreurGeneration("Plus de crédits devis", "Votre solde est à 0. Rechargez un pack (Wave ou Orange Money) ou activez le code fondateur pour un accès illimité.", "NO_CREDIT");
      return;
    }
    if (generating) return;
    setGenerating(true); setGenStep(0); setGenError(null);

    const payload = { ...form, sessionToken: getToken(), clientNom: form.clientNom.trim(), natureTravaux, photoPlanNom: photo?.name || "", photoPlanTaille: photo?.size || "", prix: prixPerso, mainOeuvrePct: moCreatePct, margePct: margeCreatePct, validiteJours: validiteCreate, moMode: moCreateMode, equipe: equipeCreate, materiauxClient: materiauxCreate, formatPdf: formatDefaut };
    const etapesAnim = [photo ? "Analyse de la photo du plan…" : "Lecture de la description des travaux…", "Calcul des quantités selon les normes CI (agglos, béton 350, acier)…", "Application de vos prix par défaut ivoiriens…", `Ajout de la main-d'œuvre (${moCreatePct} % des matériaux) et assemblage du DQE…`];
    const anim = (async () => { for (let i = 0; i < etapesAnim.length; i++) { setGenStep(i); await new Promise((r) => setTimeout(r, 600)); } })();

    const envoyer = async (): Promise<Response> => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 45000);
      try {
        return await fetchAvecRecuperation("/api/devis/generate", { method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal, body: JSON.stringify(payload) });
      } finally { clearTimeout(timeout); }
    };

    try {
      let res: Response | null = null;
      let reseau = false;
      try { res = await envoyer(); }
      catch {
        // Deuxième tentative automatique (réseau instable, y compris après un premier échec ou une coupure d'onglet).
        try { res = await envoyer(); } catch { reseau = true; }
      }
      await anim;
      if (reseau || !res) {
        erreurGeneration("Connexion au serveur impossible", "La requête n'a pas pu aboutir après deux tentatives. Vérifiez votre connexion internet, puis cliquez sur Réessayer — aucun crédit n'a été débité.", "NETWORK");
        return;
      }

      const texte = await res.text();
      let data: any = {};
      try { data = texte ? JSON.parse(texte) : {}; } catch { data = {}; }
      if (!res.ok || !data.devis) {
        if (data.code === "AUTH") {
          // Dernier recours : reconnexion rapide, puis relance automatique de la génération.
          setReconnexion({ enCours: true, email: compte?.email || form.clientTel || "" });
          erreurGeneration("Reconnexion nécessaire", "Nous n'arrivons pas à confirmer votre session. Saisissez votre mot de passe : le devis se génère automatiquement juste après.", "AUTH");
          return;
        }
        erreurGeneration("Génération impossible", data.error || `Le serveur a rencontré un problème (code ${res.status}). Réessayez — aucun crédit n'a été débité.`, data.code || "SERVER");
        return;
      }

      // Le devis existe désormais : toute erreur d'affichage ne doit jamais faire croire à un échec.
      try {
        setEntreprise(data.entreprise);
        setMainOeuvrePct(data.devis.mainOeuvrePct ?? NORMES_CI.mainOeuvrePctDefaut);
        setMargePct(data.devis.margePct ?? 0);
        setFormatPdf((data.devis.formatPdf as FormatPdf) || "general");
        setMateriauxClient(!!data.devis.materiauxClient);
        setEditorTab("devis"); setDepenses([]); setFactures([]); setAvenants([]); setShareUrl("");
        setValiditeJours(data.devis.validiteJours ?? 30);
        setMoMode(data.devis.moMode === "equipe" ? "equipe" : "pct");
        setEquipe(equipeDuDevis(data.devis));
        setPlanning(data.planning || []);
        setEditor({ devis: data.devis, lignes: syncMoMode(data.lignes || [], data.devis.moMode === "equipe" ? "equipe" : "pct", data.devis.mainOeuvrePct ?? NORMES_CI.mainOeuvrePctDefaut, equipeDuDevis(data.devis)) });
        setTvaPct(data.devis.tvaPct ?? 18);
        setRemisePct(data.devis.remisePct ?? 0);
      } catch (err) {
        console.error("Affichage du devis généré:", err);
        setEditor({ devis: data.devis, lignes: data.lignes || [] });
      }
      showToast(`DQE ${data.devis.numero} généré par IA — vérifiez et ajustez les prix.`);
      loadDashboard().catch(() => undefined);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      erreurGeneration("Erreur inattendue", e instanceof DOMException && e.name === "AbortError"
        ? "Le serveur met trop de temps à répondre. Réessayez — aucun crédit n'a été débité."
        : "Une erreur inattendue est survenue lors de la génération. Réessayez — aucun crédit n'a été débité.", "UNKNOWN");
    } finally { setGenerating(false); setGenStep(0); }
  }

  // Diagnostic de génération : session, crédits, serveur, dernier devis.
  async function lancerDiagnostic() {
    setDiag({ statut: "encours", lignes: [] });
    const lignes: { label: string; ok: boolean; detail: string }[] = [];
    try {
      const me = await fetch("/api/auth/me").then((r) => r.json()).catch(() => null);
      lignes.push({ label: "Session", ok: !!me?.compte, detail: me?.compte ? `${me.compte.email} · ${me.compte.role} · ${me.compte.plan === "illimite" ? "illimité" : `${me.compte.credits} crédit(s)`}` : "Non connecté — reconnectez-vous." });
    } catch { lignes.push({ label: "Session", ok: false, detail: "Vérification impossible (réseau)." }); }
    try {
      const h = await fetch("/api/health").then((r) => r.json()).catch(() => null);
      lignes.push({ label: "Serveur", ok: !!h?.ok, detail: h?.ok ? "API en ligne et base accessible." : "API indisponible." });
    } catch { lignes.push({ label: "Serveur", ok: false, detail: "Serveur injoignable." }); }
    try {
      const r = await fetch("/api/diagnostic", { method: "POST", headers: { "Content-Type": "application/json", "x-session-token": getToken() }, body: JSON.stringify({ sessionToken: getToken() }) });
      const d = await r.json().catch(() => ({}));
      if (r.status === 429 || r.status === 0) {
        lignes.push({ label: "Génération test", ok: false, detail: d.error || "Trop de tests consécutifs, patientez une minute." });
      } else if (r.ok && d.ok) {
        lignes.push({ label: "Moteur IA", ok: true, detail: d.message });
        lignes.push({ label: "Crédits", ok: true, detail: "Diagnostic gratuit : aucun crédit consommé, aucun devis créé." });
      } else {
        lignes.push({ label: "Moteur IA", ok: false, detail: d.message || d.error || `Échec (code ${r.status}).` });
      }
    } catch { lignes.push({ label: "Génération test", ok: false, detail: "Requête interrompue (réseau)." }); }
    setDiag({ statut: "termine", lignes });
    loadDashboard().catch(() => undefined);
  }


  async function openDevis(id: number) {
    const r = await fetchAvecRecuperation(`/api/devis/${id}`); const d = await r.json();
    if (d.devis) {
      const pct = d.devis.mainOeuvrePct ?? NORMES_CI.mainOeuvrePctDefaut;
      setMainOeuvrePct(pct); setMargePct(d.devis.margePct ?? 0); setFormatPdf((d.devis.formatPdf as FormatPdf) || "general"); setMateriauxClient(!!d.devis.materiauxClient); setEditorTab("devis");
      setValiditeJours(d.devis.validiteJours ?? 30); setMoMode(d.devis.moMode === "equipe" ? "equipe" : "pct"); setEquipe(equipeDuDevis(d.devis));
      setPlanning(d.planning || []); setAvenants(d.avenants || []); setShareUrl(d.devis.shareToken ? `${window.location.origin}/signer/${d.devis.shareToken}` : "");
      // Les anciens devis sans ligne de main-d'œuvre la reçoivent automatiquement (recalculée à l'enregistrement).
      setEditor({ devis: d.devis, lignes: syncMoMode(d.lignes, d.devis.moMode === "equipe" ? "equipe" : "pct", pct, equipeDuDevis(d.devis)) }); setTvaPct(d.devis.tvaPct ?? 18); setRemisePct(d.devis.remisePct ?? 0); window.scrollTo({ top: 0 });
      fetch(`/api/devis/${id}/factures`).then((x) => x.json()).then((j) => setFactures(j.factures || [])).catch(() => setFactures([]));
      fetch(`/api/devis/${id}/depenses`).then((x) => x.json()).then((j) => setDepenses(j.depenses || [])).catch(() => setDepenses([]));
    }
  }

  async function saveEditor(silent = false) {
    if (!editor) return null;
    setSaving(true);
    try {
      const r = await fetchAvecRecuperation(`/api/devis/${editor.devis.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lignes: editor.lignes, planning, tvaPct, remisePct, mainOeuvrePct, margePct, formatPdf, materiauxClient, validiteJours, moMode, equipe, statut: editor.devis.statut, notes: editor.devis.notes, clientTel: editor.devis.clientTel || "" }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.devis || !Array.isArray(d.lignes)) {
        showToast(d.error || "Impossible d'enregistrer le devis. Vérifiez votre connexion.");
        return null;
      }
      setMainOeuvrePct(d.devis.mainOeuvrePct ?? mainOeuvrePct); setMargePct(d.devis.margePct ?? margePct); setFormatPdf((d.devis.formatPdf as FormatPdf) || formatPdf); setMateriauxClient(!!d.devis.materiauxClient);
      if (d.planning) setPlanning(d.planning); if (d.avenants) setAvenants(d.avenants);
      setEditor({ devis: d.devis, lignes: d.lignes }); await loadDashboard();
      if (!silent) showToast("Devis enregistré.");
      return d;
    } catch {
      showToast("Impossible d'enregistrer le devis. Vérifiez votre connexion.");
      return null;
    } finally { setSaving(false); }
  }

  async function addDepense() {
    if (!editor) return;
    if (depenseForm.libelle.trim().length < 2 || !(Number(depenseForm.montant) > 0)) { showToast("Indiquez le libellé et le montant de l'achat."); return; }
    const r = await fetchAvecRecuperation(`/api/devis/${editor.devis.id}/depenses`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ libelle: depenseForm.libelle, montant: Number(depenseForm.montant), dateDepense: depenseForm.dateDepense || new Date().toISOString().slice(0, 10) }) });
    const j = await r.json();
    if (!r.ok) { showToast(j.error || "Enregistrement impossible"); return; }
    setDepenses(j.depenses || []); setDepenseForm({ libelle: "", montant: "", dateDepense: "" });
    showToast("Dépense enregistrée — marge nette recalculée.");
  }
  async function deleteDepense(dep: any) {
    if (!editor || !confirm(`Supprimer la dépense « ${dep.libelle} » (${fcfa(dep.montant)}) ?`)) return;
    const r = await fetch(`/api/devis/${editor.devis.id}/depenses`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ depenseId: dep.id }) });
    const j = await r.json(); if (r.ok) setDepenses(j.depenses || []);
  }
  const totalDepensesEditor = useMemo(() => depenses.reduce((sum, x) => sum + (Number(x.montant) || 0), 0), [depenses]);

  async function deleteDevis(id: number) {
    if (!confirm("Supprimer ce devis définitivement ?")) return;
    await fetch(`/api/devis/${id}`, { method: "DELETE" }); setEditor(null); await loadDashboard(); showToast("Devis supprimé.");
  }

  function goEntreprise() {
    setProfilForm(entreprise ? { ...entreprise } : null);
    setTab("entreprise");
    window.scrollTo({ top: 0 });
  }

  async function saveProfil() {
    if (!profilForm) return;
    setSavingProfil(true);
    try {
      const r = await fetchAvecRecuperation("/api/entreprise", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(profilForm) });
      const d = await r.json();
      if (!r.ok) { showToast(d.error || "Erreur d'enregistrement"); return; }
      setEntreprise(d.entreprise); setProfilForm({ ...d.entreprise });
      showToast("Profil enregistré — logo, cachet, RCCM et CC apparaîtront sur vos PDF.");
    } catch { showToast("Connexion impossible."); } finally { setSavingProfil(false); }
  }

  // ---------- Liste d'achats quincaillerie (quantités nettes, sans prix) ----------
  function achatsTexte(d: Devis, lignes: Ligne[]) {
    const achats = listeAchatsMateriaux(lignes);
    const lignesTxt = achats.map((a) => `- ${a.designation} : *${nombre(a.quantite)} ${a.unite}*`).join("\n");
    return `Bonjour,\n\nCommande matériaux pour le compte de *${entreprise?.nom || "DevisBTP CI"}*.\nChantier : ${d.clientNom} — ${d.lieu} (réf. devis ${d.numero})\nDate : ${new Date().toLocaleDateString("fr-FR")}\n\n*Quantités demandées :*\n${lignesTxt}\n\nMerci de nous communiquer vos meilleurs prix, la disponibilité et les frais de livraison sur le chantier.\nContact : ${entreprise?.proprietaire || ""} — ${entreprise?.telephone || ""}`;
  }

  async function openAchats(d: Devis, lignesArg?: Ligne[]) {
    if (lignesArg) { setAchatsModal({ devis: d, lignes: lignesArg }); return; }
    if (editor && d.id === editor.devis.id) { setAchatsModal({ devis: editor.devis, lignes: editor.lignes }); return; }
    const r = await fetch(`/api/devis/${d.id}`); const j = await r.json();
    setAchatsModal({ devis: j.devis, lignes: j.lignes });
  }

  async function copierAchats() {
    if (!achatsModal) return;
    const txt = achatsTexte(achatsModal.devis, achatsModal.lignes);
    try { await navigator.clipboard.writeText(txt); showToast("Liste d'achats copiée — collez-la dans WhatsApp."); }
    catch {
      try {
        const ta = document.createElement("textarea"); ta.value = txt; ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.focus(); ta.select();
        document.execCommand("copy"); document.body.removeChild(ta);
        showToast("Liste d'achats copiée.");
      } catch { showToast("Copie impossible — ouvrez WhatsApp et collez le texte de l'aperçu."); }
    }
  }

  // ---------- Factures d'acompte ----------
  async function openAcompte(d: Devis) {
    setAcompteModal({ devis: d }); setDerniereFacture(null); setAcompteError(""); setAcomptePct(30); setAcompteCustom("");
    try { const r = await fetch(`/api/devis/${d.id}/factures`); const j = await r.json(); if (d.id === editor?.devis?.id) setFactures(j.factures || []); else setFactures(j.factures || []); } catch { /* ignore */ }
  }

  const acomptePctEffectif = acompteCustom !== "" ? Math.min(100, Math.max(1, Number(acompteCustom) || 0)) : acomptePct;
  const dejaFactureTotal = factures.filter((f) => f.statut !== "annulee").reduce((s, f) => s + f.montant, 0);

  async function creerFactureAcompte() {
    if (!acompteModal) return;
    setCreatingFacture(true); setAcompteError("");
    try {
      // S'assure que le devis ouvert est enregistré (marge et totaux à jour) avant facturation.
      if (editor && acompteModal.devis.id === editor.devis.id) await saveEditor(true);
      const r = await fetchAvecRecuperation(`/api/devis/${acompteModal.devis.id}/factures`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pct: acomptePctEffectif }) });
      const d = await r.json();
      if (!r.ok) { setAcompteError(d.error || "Création impossible"); return; }
      setFactures(d.factures || []); setDerniereFacture(d.facture);
      setAcompteModal({ devis: d.devis });
      showToast(`Facture d'acompte ${d.facture.numero} créée : ${fcfa(d.facture.montant)}.`);
    } catch { setAcompteError("Connexion impossible."); } finally { setCreatingFacture(false); }
  }

  async function setStatutFacture(f: any, statut: string) {
    const r = await fetch(`/api/devis/${f.devisId}/factures`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ factureId: f.id, statut }) });
    const d = await r.json(); if (r.ok) setFactures(d.factures || []);
  }

  function renderWhatsAppDestinataire() {
    if (!waModal) return null;
    const numeroSaisi = normaliserNumeroWhatsApp(waTel);
    const lien = creerLienWhatsApp(waTel, waModal.texte);
    const clesCarnet = new Set(waCarnet.map((contact) => {
      const numero = normaliserNumeroWhatsApp(contact.tel);
      return numero.valide ? numero.numero : "";
    }));
    const clients = Array.from(new Map(devisList.flatMap((d) => {
      const numero = normaliserNumeroWhatsApp(d.clientTel || "");
      return numero.valide && !numero.vide
        ? [[numero.numero, { nom: d.clientNom as string, tel: d.clientTel as string }] as const]
        : [];
    })).values()).slice(0, 12);
    const carnet = [...waCarnet, ...clients.filter((contact) => {
      const numero = normaliserNumeroWhatsApp(contact.tel);
      return numero.valide && !clesCarnet.has(numero.numero);
    })];

    return (
      <div className="fixed inset-0 z-[65] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4" onClick={() => setWaModal(null)}>
        <div role="dialog" aria-modal="true" aria-labelledby="whatsapp-title" className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 animate-scaleIn max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-start gap-3">
            <span className="bg-[#25D366] text-white p-2.5 rounded-2xl shrink-0"><MessageCircle size={20} /></span>
            <div className="flex-1 min-w-0">
              <h3 id="whatsapp-title" className="font-extrabold text-lg leading-tight">Envoyer sur WhatsApp</h3>
              <p className="text-[13px] text-slate-500">{waModal.titre}</p>
            </div>
            <button type="button" onClick={() => setWaModal(null)} className="p-2 bg-slate-100 rounded-xl shrink-0" aria-label="Fermer"><X size={16} /></button>
          </div>

          <label htmlFor="whatsapp-destinataire" className="block mt-4 text-[11px] font-extrabold text-slate-500">NUMÉRO DU DESTINATAIRE</label>
          <div className="flex gap-2 mt-1.5">
            <input id="whatsapp-destinataire" value={waTel} onChange={(e) => { setWaTel(e.target.value); setWaErreur(""); }} type="tel" inputMode="tel" autoComplete="tel" placeholder="Ex : 07 07 12 34 56"
              className="flex-1 min-w-0 border-2 border-slate-200 rounded-2xl px-4 py-3.5 font-bold outline-none focus:border-[#25D366] tnum" />
            <button type="button" onClick={choisirContactTelephone} title="Choisir dans les contacts du téléphone"
              className="bg-slate-900 text-white font-bold px-3.5 rounded-2xl flex items-center gap-1.5 shrink-0 text-[12px]">
              <UserPlus size={16} /> Contacts
            </button>
          </div>
          <p className="text-[11px] text-slate-500 mt-1.5">Saisissez les 10 chiffres du numéro ivoirien, avec ou sans +225. Le zéro initial est conservé.</p>
          {numeroSaisi.valide && !numeroSaisi.vide && <p className="text-[11px] font-bold text-emerald-700 mt-1 break-all">Lien : https://wa.me/{numeroSaisi.numero}</p>}
          {numeroSaisi.valide && numeroSaisi.vide && <p className="text-[11px] text-slate-400 mt-1">Sans numéro, WhatsApp vous laissera choisir le contact.</p>}

          {carnet.length > 0 && (
            <div className="mt-3">
              <p className="text-[11px] font-extrabold text-slate-400">MES CONTACTS ({carnet.length})</p>
              <div className="mt-1.5 max-h-44 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-2xl">
                {carnet.map((contact, i) => {
                  const lienContact = creerLienWhatsApp(contact.tel, waModal.texte);
                  const numeroContact = normaliserNumeroWhatsApp(contact.tel);
                  const dansCarnet = numeroContact.valide && clesCarnet.has(numeroContact.numero);
                  return (
                    <div key={`${contact.tel}-${i}`} className="flex items-center gap-2 px-3 py-2.5">
                      <button type="button" onClick={() => { setWaTel(contact.tel); setWaErreur(""); }} className="flex-1 min-w-0 text-left">
                        <span className="block font-bold text-[13px] truncate">{contact.nom || "Sans nom"}</span>
                        <span className="block text-[11.5px] text-slate-500 tnum">{contact.tel}</span>
                      </button>
                      <a href={lienContact || "#"} target="_blank" rel="noopener noreferrer" onClick={(e) => { if (!preparerEnvoiWhatsApp(contact.tel)) e.preventDefault(); }} className="bg-[#25D366] text-white text-[11px] font-extrabold px-2.5 py-1.5 rounded-lg shrink-0">Envoyer</a>
                      {dansCarnet && <button type="button" onClick={() => enregistrerCarnet(waCarnet.filter((x) => {
                        const numero = normaliserNumeroWhatsApp(x.tel);
                        return !numero.valide || !numeroContact.valide || numero.numero !== numeroContact.numero;
                      }))} className="text-slate-400 p-1.5 shrink-0" aria-label="Retirer du carnet"><Trash2 size={14} /></button>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <details className="mt-3">
            <summary className="text-[12px] font-bold text-slate-500 cursor-pointer">Ajouter un contact au carnet</summary>
            <div className="grid grid-cols-[1fr_1fr_auto] gap-2 mt-2">
              <input value={waNouveau.nom} onChange={(e) => setWaNouveau({ ...waNouveau, nom: e.target.value })} placeholder="Nom" className="border-2 border-slate-200 rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-[#25D366] min-w-0" />
              <input value={waNouveau.tel} onChange={(e) => setWaNouveau({ ...waNouveau, tel: e.target.value })} placeholder="Numéro" inputMode="tel" className="border-2 border-slate-200 rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-[#25D366] min-w-0" />
              <button type="button" onClick={() => {
                const numero = normaliserNumeroWhatsApp(waNouveau.tel);
                if (!numero.valide || numero.vide) { setWaErreur(numero.valide ? "Indiquez un numéro pour ce contact." : numero.erreur); return; }
                enregistrerCarnet([{ nom: waNouveau.nom || "Contact", tel: waNouveau.tel }, ...waCarnet.filter((contact) => {
                  const existant = normaliserNumeroWhatsApp(contact.tel);
                  return !existant.valide || existant.numero !== numero.numero;
                })].slice(0, 50));
                setWaTel(waNouveau.tel); setWaNouveau({ nom: "", tel: "" }); setWaErreur("");
              }} className="bg-slate-900 text-white font-bold px-3 rounded-xl shrink-0 text-[13px]">Ajouter</button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Le carnet est enregistré sur cet appareil.</p>
          </details>

          <details className="mt-2">
            <summary className="text-[12px] font-bold text-slate-500 cursor-pointer">Aperçu du message</summary>
            <pre className="whitespace-pre-wrap text-[11.5px] bg-[#F1F5F9] rounded-xl p-3 mt-2 font-sans max-h-40 overflow-y-auto">{waModal.texte}</pre>
          </details>

          {waErreur && <p role="alert" className="bg-amber-50 text-amber-900 border border-amber-200 text-[12.5px] rounded-xl px-3.5 py-2.5 mt-3">{waErreur}</p>}

          <div className="grid grid-cols-[1fr_auto] gap-2 mt-4">
            <a href={lien || "#"} target="_blank" rel="noopener noreferrer" onClick={(e) => { if (!preparerEnvoiWhatsApp()) e.preventDefault(); }} className="bg-[#25D366] hover:bg-[#1EB857] text-white font-extrabold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-200 active:scale-[.98] transition">
              <MessageCircle size={19} /> Envoyer sur WhatsApp
            </a>
            <button type="button" onClick={copierMessageWhatsApp} className="bg-slate-100 text-slate-700 font-bold px-4 rounded-2xl flex items-center justify-center gap-1.5" title="Copier le message" aria-label="Copier le message"><Copy size={17} /></button>
          </div>
          <button type="button" onClick={copierLienWhatsApp} className="mt-2 w-full text-[12px] font-bold text-slate-600 underline underline-offset-2">Copier le lien WhatsApp</button>
          <p className="text-[11px] text-slate-400 text-center mt-2">Le numéro doit être associé à un compte WhatsApp. Pour joindre le PDF, téléchargez-le puis ajoutez-le dans la conversation.</p>
        </div>
      </div>
    );
  }

  function renderPdfApercu() {
    if (!pdfApercu) return null;
    return (
        <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex flex-col p-2 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl flex-1 flex flex-col overflow-hidden max-w-4xl w-full mx-auto">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 shrink-0">
              <span className="bg-amber-100 text-[#B45309] p-2 rounded-xl shrink-0"><Printer size={17} /></span>
              <div className="flex-1 min-w-0"><p className="font-extrabold text-[14px] truncate">Aperçu du PDF — {formatPapier}</p><p className="text-[11px] text-slate-400 truncate">{pdfApercu.nom}</p></div>
              <button onClick={() => setPdfApercu(null)} className="p-2 bg-slate-100 rounded-xl shrink-0" aria-label="Fermer l'aperçu"><X size={16} /></button>
            </div>
            <iframe src={pdfApercu.url} title="Aperçu PDF" className="flex-1 w-full bg-slate-100" />
            <div className="grid grid-cols-2 gap-2 p-3 border-t border-slate-200 shrink-0">
              <button onClick={() => {
                const f = document.querySelector<HTMLIFrameElement>('iframe[title="Aperçu PDF"]');
                try { f?.contentWindow?.focus(); f?.contentWindow?.print(); } catch { window.open(pdfApercu.url, "_blank"); }
              }} className="bg-[#F59E0B] hover:bg-[#D97706] text-white font-extrabold py-3.5 rounded-2xl flex items-center justify-center gap-2 text-sm"><Printer size={17} /> Imprimer</button>
              <a href={pdfApercu.url} download={pdfApercu.nom} className="bg-slate-900 text-white font-extrabold py-3.5 rounded-2xl flex items-center justify-center gap-2 text-sm"><Download size={17} /> Télécharger</a>
            </div>
          </div>
        </div>
    );
  }

  function renderProModals() {
    const achats = achatsModal ? listeAchatsMateriaux(achatsModal.lignes) : [];
    const dA = acompteModal?.devis;
    const montantAcompte = dA ? Math.round(((dA.totalTTC || 0) * acomptePctEffectif) / 100) : 0;
    const soldeApres = dA ? (dA.totalTTC || 0) - dejaFactureTotal - montantAcompte : 0;
    return (
      <>
        {achatsModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4" onClick={() => setAchatsModal(null)}>
            <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl p-5 animate-fadeUp max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-start gap-3">
                <span className="bg-emerald-100 text-emerald-700 p-2.5 rounded-2xl shrink-0"><ShoppingCart size={20} /></span>
                <div className="flex-1 min-w-0">
                  <h3 className="font-extrabold text-lg leading-tight">Liste d'achats matériaux</h3>
                  <p className="text-sm text-slate-500">{achatsModal.devis.numero} • {achatsModal.devis.clientNom} — {achatsModal.devis.lieu}</p>
                </div>
                <button onClick={() => setAchatsModal(null)} className="p-2 bg-slate-100 rounded-xl shrink-0"><X size={16} /></button>
              </div>
              <p className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 mt-3 flex items-center gap-1.5"><ShieldCheck size={14} /> Quantités nettes uniquement — aucun prix, aucune main-d'œuvre. Prêt pour la quincaillerie.</p>
              <div className="mt-3 border rounded-2xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="bg-[#0F172A] text-white text-left"><th className="px-3.5 py-2.5 font-bold">Matériau</th><th className="px-3.5 py-2.5 font-bold text-right">Quantité nette</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {achats.map((a, i) => (
                      <tr key={i} className={i % 2 ? "bg-slate-50/70" : ""}><td className="px-3.5 py-2.5 font-medium">{a.designation}</td><td className="px-3.5 py-2.5 text-right font-extrabold whitespace-nowrap">{nombre(a.quantite)} {a.unite}</td></tr>
                    ))}
                    {achats.length === 0 && <tr><td colSpan={2} className="px-3.5 py-4 text-center text-slate-400">Aucun matériau détecté dans ce devis.</td></tr>}
                  </tbody>
                </table>
              </div>
              <label className="block mt-4"><span className="text-xs font-bold text-slate-500">NUMÉRO WHATSAPP DU FOURNISSEUR (OPTIONNEL)</span>
                <input value={fournisseurTel} onChange={(e) => setFournisseurTel(e.target.value)} placeholder="Ex : 07 08 45 12 30" inputMode="tel" className="w-full border-2 border-slate-200 rounded-2xl px-4 py-3 mt-1.5 font-semibold outline-none focus:border-[#009A44]" /></label>
              <div className="grid grid-cols-2 gap-2 mt-4">
                <button onClick={copierAchats} className="bg-slate-900 text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 text-sm"><Copy size={16} /> Copier la liste</button>
                <button onClick={() => { const tel = fournisseurTel.replace(/[^\d]/g, "").replace(/^225/, ""); demanderDestinataire({ titre: "Envoyer la liste d'achats au fournisseur", texte: achatsTexte(achatsModal.devis, achatsModal.lignes), tel: fournisseurTel, nom: "Fournisseur" }); }} className="bg-[#25D366] text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 text-sm"><MessageCircle size={16} /> WhatsApp fournisseur</button>
              </div>
              <details className="mt-4">
                <summary className="text-xs font-bold text-slate-500 cursor-pointer">Aperçu du message envoyé</summary>
                <pre className="whitespace-pre-wrap text-[12px] bg-[#F1F5F9] rounded-xl p-3 mt-2 font-sans">{achatsTexte(achatsModal.devis, achatsModal.lignes)}</pre>
              </details>
            </div>
          </div>
        )}

        {avenantModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4" onClick={() => setAvenantModal(null)}>
            <div className="bg-white w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl p-5 animate-fadeUp max-h-[94vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-start gap-3">
                <span className="bg-violet-100 text-violet-700 p-2.5 rounded-2xl shrink-0"><FilePlus2 size={20} /></span>
                <div className="flex-1 min-w-0">
                  <h3 className="font-extrabold text-lg leading-tight">{avenantModal.avenant ? `Avenant ${avenantModal.avenant.numero}` : "Créer un avenant"}</h3>
                  <p className="text-sm text-slate-500">Lié au devis <b>{avenantModal.devis.numero}</b> • {avenantModal.devis.clientNom} — {avenantModal.devis.lieu} • Devis initial : {fcfa(avenantModal.devis.totalTTC)} TTC</p>
                </div>
                <button onClick={() => setAvenantModal(null)} className="p-2 bg-slate-100 rounded-xl shrink-0"><X size={16} /></button>
              </div>

              {avenants.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-extrabold text-slate-500">AVENANTS EXISTANTS DE CE DEVIS</p>
                  <div className="space-y-2 mt-2">
                    {avenants.map((a) => (
                      <div key={a.id} className="flex flex-wrap items-center gap-2 bg-violet-50/70 border border-violet-100 rounded-xl px-3 py-2.5">
                        <div className="flex-1 min-w-[160px]"><p className="font-bold text-[13px]">{a.numero} — {a.titre}</p><p className="text-[11px] text-slate-500">{fcfa(a.totalTTC)} TTC • {a.statut}</p></div>
                        <button onClick={() => openAvenant(avenantModal.devis, a)} className="bg-slate-900 text-white text-xs font-bold px-3 py-2 rounded-lg">Ouvrir</button>
                        <button onClick={() => downloadAvenantPDF(a, avenantModal.devis)} className="bg-[#F59E0B] text-white text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1"><Download size={13} /> PDF</button>
                        <button onClick={() => deleteAvenant(a)} className="bg-red-50 text-red-600 border border-red-200 text-xs font-bold px-3 py-2 rounded-lg">Supprimer</button>
                      </div>
                    ))}
                  </div>
                  <p className="text-[12px] text-slate-500 mt-2">Total chantier avec avenants signés : <b>{fcfa(avenantModal.devis.totalTTC + avenants.filter((x) => x.statut === "signe").reduce((s, x) => s + x.totalTTC, 0))}</b></p>
                  <button onClick={() => openAvenant(avenantModal.devis)} className="mt-2 text-sm font-bold text-violet-700 flex items-center gap-1"><Plus size={15} /> Nouvel avenant</button>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-3 mt-4">
                <label className="block"><span className="text-xs font-bold text-slate-500">TITRE DE L'AVENANT</span>
                  <input value={avForm.titre} onChange={(e) => setAvForm({ ...avForm, titre: e.target.value })} className="w-full border-2 border-slate-200 rounded-xl px-3.5 py-2.5 mt-1 font-semibold outline-none focus:border-violet-400" placeholder="Ex : Portail motorisé + terrasse" /></label>
                <label className="block"><span className="text-xs font-bold text-slate-500">STATUT</span>
                  <select value={avForm.statut} onChange={(e) => setAvForm({ ...avForm, statut: e.target.value })} className="w-full border-2 border-slate-200 rounded-xl px-3.5 py-2.5 mt-1 font-semibold bg-white outline-none">
                    <option value="brouillon">Brouillon</option><option value="envoye">Envoyé au client</option><option value="signe">Validé par le client</option>
                  </select></label>
              </div>
              <label className="block mt-3"><span className="text-xs font-bold text-slate-500">TRAVAUX SUPPLÉMENTAIRES DEMANDÉS</span>
                <textarea value={avForm.description} onChange={(e) => setAvForm({ ...avForm, description: e.target.value })} rows={3} placeholder="Décrivez les travaux en plus : ex. ajout d'un faux plafond au séjour, carrelage de la terrasse, 2 points de climatisation…" className="w-full border-2 border-slate-200 rounded-xl px-3.5 py-2.5 mt-1 font-medium outline-none focus:border-violet-400 leading-snug" /></label>
              <button onClick={() => { setAvLignes(suggererLignesAvenant(avForm.description, avenantModal.devis.surface || 100).map((l) => ({ ...l }))); showToast("Lignes proposées par l'IA — ajustez quantités et prix."); }} className="mt-2 bg-violet-600 text-white font-bold text-sm px-4 py-2.5 rounded-xl flex items-center gap-2"><Sparkles size={15} /> Proposer des lignes par IA</button>

              <div className="mt-4 space-y-2">
                <p className="text-xs font-extrabold text-slate-500">LIGNES CHIFFRÉES DE L'AVENANT</p>
                {avLignes.map((l, i) => (
                  <div key={i} className="border rounded-2xl p-3 bg-[#FBFAF7]">
                    <div className="flex gap-2">
                      <input value={l.designation} onChange={(e) => { const nl = [...avLignes]; nl[i] = { ...l, designation: e.target.value }; setAvLignes(nl); }} className="flex-1 min-w-0 border rounded-lg px-2.5 py-2 font-semibold text-sm outline-none" placeholder="Désignation" />
                      <button onClick={() => setAvLignes(avLignes.filter((_, j) => j !== i))} className="text-red-500 bg-red-50 p-2 rounded-lg shrink-0"><Trash2 size={15} /></button>
                    </div>
                    <input value={l.detail || ""} onChange={(e) => { const nl = [...avLignes]; nl[i] = { ...l, detail: e.target.value }; setAvLignes(nl); }} className="w-full border rounded-lg px-2.5 py-1.5 mt-2 text-xs outline-none" placeholder="Détail (optionnel)" />
                    <div className="grid grid-cols-[1fr_1fr_auto] gap-2 mt-2 items-end">
                      <label><span className="text-[11px] font-bold text-slate-500">QTÉ ({l.unite})</span><input type="number" value={l.quantite} onChange={(e) => { const nl = [...avLignes]; nl[i] = { ...l, quantite: Number(e.target.value) }; setAvLignes(nl); }} className="w-full border rounded-lg px-2.5 py-2 mt-0.5 font-semibold outline-none" /></label>
                      <label><span className="text-[11px] font-bold text-slate-500">PRIX UNIT. FCFA</span><input type="number" value={l.prixUnitaire} onChange={(e) => { const nl = [...avLignes]; nl[i] = { ...l, prixUnitaire: Number(e.target.value) }; setAvLignes(nl); }} className="w-full border rounded-lg px-2.5 py-2 mt-0.5 font-semibold outline-none" /></label>
                      <b className="text-sm whitespace-nowrap pb-2">{fcfa(l.quantite * l.prixUnitaire)}</b>
                    </div>
                  </div>
                ))}
                <button onClick={() => setAvLignes([...avLignes, { section: "Travaux supplémentaires", designation: "", detail: "", unite: "u", quantite: 1, prixUnitaire: 0 }])} className="w-full border-2 border-dashed border-slate-300 font-bold text-sm py-2.5 rounded-xl text-slate-600 flex items-center justify-center gap-1.5"><Plus size={15} /> Ajouter une ligne</button>
              </div>

              <div className="bg-[#F1F5F9] rounded-2xl p-4 mt-4 text-sm space-y-1.5">
                <div className="flex justify-between"><span>Total avenant HT</span><b>{fcfa(avTotaux.ht)}</b></div>
                <div className="flex justify-between"><span>TVA {avenantModal.devis.tvaPct ?? 18} %</span><b>{fcfa(avTotaux.tva)}</b></div>
                <div className="flex justify-between border-t border-slate-300 pt-2"><span className="font-bold">Total avenant TTC</span><b className="text-violet-700">{fcfa(avTotaux.ttc)}</b></div>
                <div className="flex justify-between"><span>Nouveau total du chantier (si signé)</span><b>{fcfa(avenantModal.devis.totalTTC + avenants.filter((x) => x.statut === "signe" && x.id !== avenantModal.avenant?.id).reduce((s, x) => s + x.totalTTC, 0) + avTotaux.ttc)}</b></div>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-4">
                <button onClick={saveAvenant} disabled={!avLignes.length} className="bg-slate-900 disabled:opacity-40 text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-1.5 text-sm"><Save size={16} /> Enregistrer</button>
                <button onClick={async () => {
                  let a = avenantModal.avenant;
                  if (!a) {
                    const saved = await saveAvenant();
                    if (!saved) return;
                    a = saved.avenant;
                  }
                  await downloadAvenantPDF(a, avenantModal.devis, a.lignes || avLignes);
                }} className="bg-[#F59E0B] text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-1.5 text-sm"><Download size={16} /> PDF officiel</button>
                <button onClick={async () => {
                  const sauvegarde = await saveAvenant();
                  if (!sauvegarde) return;
                  const a = sauvegarde.avenant;
                  demanderDestinataire({ titre: `Envoyer l'avenant ${a.numero}`, texte: avenantWhatsAppText(a, sauvegarde.devis, a.lignes || avLignes), tel: sauvegarde.devis.clientTel || "", nom: sauvegarde.devis.clientNom });
                }} disabled={!avLignes.length} className="bg-[#25D366] text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-1.5 text-sm disabled:opacity-50"><MessageCircle size={16} /> WhatsApp</button>
              </div>
              <p className="text-[11px] text-slate-400 text-center mt-2.5">Document officiel rattaché au devis d'origine, avec votre logo, RCCM/CC, signature et cachet.</p>
            </div>
          </div>
        )}

        {acompteModal && dA && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4" onClick={() => setAcompteModal(null)}>
            <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl p-5 animate-fadeUp max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-start gap-3">
                <span className="bg-orange-100 text-[#B45309] p-2.5 rounded-2xl shrink-0"><Receipt size={20} /></span>
                <div className="flex-1 min-w-0">
                  <h3 className="font-extrabold text-lg leading-tight">Facture d'acompte</h3>
                  <p className="text-sm text-slate-500">{dA.numero} • {dA.clientNom} — Total devis : <b className="text-slate-700">{fcfa(dA.totalTTC)}</b></p>
                </div>
                <button onClick={() => setAcompteModal(null)} className="p-2 bg-slate-100 rounded-xl shrink-0"><X size={16} /></button>
              </div>

              {derniereFacture ? (
                <div className="text-center py-3">
                  <span className="bg-emerald-100 text-emerald-600 w-14 h-14 rounded-full grid place-items-center mx-auto"><CheckCircle2 size={30} /></span>
                  <h4 className="font-extrabold text-lg mt-3">{derniereFacture.numero} créée</h4>
                  <p className="text-sm text-slate-500 mt-1">Acompte de {derniereFacture.pct} % : <b className="text-slate-800">{fcfa(derniereFacture.montant)}</b><br />Solde restant : <b className="text-slate-800">{fcfa(derniereFacture.soldeRestant)}</b></p>
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    <button onClick={() => downloadFacturePDF(derniereFacture, dA)} className="bg-[#F59E0B] text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 text-sm"><Download size={16} /> PDF facture</button>
                    <button onClick={() => { demanderDestinataire({ titre: `Envoyer la facture ${derniereFacture.numero}`, texte: factureWhatsAppText(derniereFacture, dA), tel: dA.clientTel || "", nom: dA.clientNom }); }} className="bg-[#25D366] text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 text-sm"><MessageCircle size={16} /> WhatsApp client</button>
                  </div>
                  <button onClick={() => setDerniereFacture(null)} className="mt-3 font-semibold text-slate-500 text-sm">Créer un autre acompte</button>
                </div>
              ) : (
                <>
                  <p className="text-xs font-bold text-slate-500 mt-5 mb-2">POURCENTAGE DE L'ACOMPTE (SUR LE TOTAL TTC)</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[30, 40].map((p) => (
                      <button key={p} onClick={() => { setAcomptePct(p); setAcompteCustom(""); }} className={`border-2 rounded-2xl py-3.5 font-extrabold ${acompteCustom === "" && acomptePct === p ? "border-[#F59E0B] bg-orange-50 text-[#B45309]" : "border-slate-200 text-slate-500"}`}>{p} %</button>
                    ))}
                    <div className={`border-2 rounded-2xl px-3 py-2 ${acompteCustom !== "" ? "border-[#F59E0B] bg-orange-50" : "border-slate-200"}`}>
                      <span className="text-[10px] font-bold text-slate-400 block">PERSONNALISÉ</span>
                      <div className="flex items-center"><input type="number" min={1} max={100} value={acompteCustom} onChange={(e) => setAcompteCustom(e.target.value)} placeholder="50" className="w-full font-extrabold outline-none bg-transparent" /><span className="font-bold text-slate-400">%</span></div>
                    </div>
                  </div>
                  <div className="bg-[#F1F5F9] rounded-2xl p-4 mt-4 text-sm space-y-1.5">
                    <div className="flex justify-between"><span>Total du devis (TTC)</span><b>{fcfa(dA.totalTTC)}</b></div>
                    <div className="flex justify-between"><span>Déjà facturé</span><b>{fcfa(dejaFactureTotal)}</b></div>
                    <div className="flex justify-between text-[#B45309]"><span>Montant dû ({acomptePctEffectif} %)</span><b>{fcfa(montantAcompte)}</b></div>
                    <div className="flex justify-between border-t border-slate-300 pt-2"><span className="font-bold">Solde restant après cet acompte</span><b>{fcfa(Math.max(0, soldeApres))}</b></div>
                  </div>
                  {acompteError && <p className="bg-red-50 text-red-700 border border-red-200 text-sm rounded-xl px-3.5 py-2.5 mt-3">{acompteError}</p>}
                  <button onClick={creerFactureAcompte} disabled={creatingFacture || montantAcompte <= 0} className="mt-4 w-full bg-[#F59E0B] disabled:opacity-50 text-white font-extrabold py-4 rounded-2xl flex items-center justify-center gap-2"><Receipt size={17} /> {creatingFacture ? "Création…" : `Créer la facture d'acompte de ${fcfa(montantAcompte)}`}</button>
                  <p className="text-[11px] text-slate-400 text-center mt-2.5">La facture reprend votre logo, RCCM/CC et cachet. Solde recalculé automatiquement avec les acomptes précédents.</p>
                </>
              )}
            </div>
          </div>
        )}
      </>
    );
  }

  // ---------- Avenants ----------
  const avTotaux = useMemo(() => {
    const ht = avLignes.reduce((s, l) => s + (Number(l.quantite) || 0) * (Number(l.prixUnitaire) || 0), 0);
    const tva = ht * (avenantModal?.devis?.tvaPct ?? tvaPct ?? 18) / 100;
    return { ht, tva, ttc: ht + tva };
  }, [avLignes, avenantModal, tvaPct]);

  async function openAvenant(d: Devis, existing?: any) {
    let devisFull = d;
    if (!existing && d.id !== editor?.devis?.id) {
      try { const r = await fetch(`/api/devis/${d.id}`); const j = await r.json(); devisFull = j.devis; setAvenants(j.avenants || []); } catch { /* ignore */ }
    }
    if (existing) {
      setAvForm({ titre: existing.titre, description: existing.description || "", statut: existing.statut });
      setAvLignes((existing.lignes || []).map((l: any) => ({ designation: l.designation, detail: l.detail || "", unite: l.unite, quantite: l.quantite, prixUnitaire: l.prixUnitaire, section: "Travaux supplémentaires" })));
      setAvenantModal({ devis: devisFull, avenant: existing });
    } else {
      setAvForm({ titre: "Travaux supplémentaires", description: "", statut: "brouillon" });
      setAvLignes([]);
      setAvenantModal({ devis: devisFull });
    }
  }

  async function saveAvenant() {
    if (!avenantModal) return null;
    const d = avenantModal.devis;
    const payload = { titre: avForm.titre, description: avForm.description, statut: avForm.statut, tvaPct: d.tvaPct ?? 18, lignes: avLignes, ...(avenantModal.avenant ? { avenantId: avenantModal.avenant.id } : {}) };
    const method = avenantModal.avenant ? "PUT" : "POST";
    try {
      const r = await fetchAvecRecuperation(`/api/devis/${d.id}/avenants`, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.avenant) { showToast(j.error || "Enregistrement de l'avenant impossible."); return null; }
      setAvenants(j.avenants || []);
      setAvenantModal({ devis: d, avenant: j.avenant });
      showToast(`Avenant ${j.avenant.numero} enregistré (${fcfa(j.avenant.totalTTC)} TTC).`);
      return { avenant: j.avenant, devis: d } as { avenant: any; devis: Devis };
    } catch {
      showToast("Impossible d'enregistrer l'avenant. Vérifiez votre connexion.");
      return null;
    }
  }

  async function deleteAvenant(a: any) {
    if (!avenantModal || !confirm(`Supprimer l'avenant ${a.numero} ?`)) return;
    const r = await fetch(`/api/devis/${avenantModal.devis.id}/avenants`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ avenantId: a.id }) });
    const j = await r.json(); if (r.ok) { setAvenants(j.avenants || []); if (avenantModal.avenant?.id === a.id) setAvenantModal({ devis: avenantModal.devis }); }
  }

  function avenantWhatsAppText(a: any, d: Devis, lignesA: Ligne[]) {
    const cumul = (d.totalTTC || 0) + (avenants.filter((x) => x.statut === "signe").reduce((s, x) => s + x.totalTTC, 0));
    const detail = lignesA.map((l) => `- ${l.designation} : ${nombre(l.quantite)} ${l.unite} × ${fcfa(l.prixUnitaire)}`).join("\n");
    return `Bonjour ${d.clientNom},\n\nVoici l'*avenant ${a.numero || ""}* lié à votre devis ${d.numero} (${d.lieu}).\n\n*${a.titre || avForm.titre}*\n${a.description || avForm.description || ""}\n\n${detail}\n\nMontant de l'avenant : *${fcfa(a.totalTTC || avTotaux.ttc)} TTC*\nTotal du devis initial : ${fcfa(d.totalTTC)}\n\nMerci de valider ces travaux supplémentaires pour que nous puissions les intégrer au chantier.\n${entreprise?.nom || ""} — ${entreprise?.telephone || ""}`;
  }

  // ---------- Signature électronique client ----------
  async function genererLienSignature() {
    if (!editor) return;
    await saveEditor(true);
    const r = await fetchAvecRecuperation(`/api/devis/${editor.devis.id}/share`, { method: "POST" });
    const j = await r.json();
    if (!r.ok) { showToast(j.error || "Lien impossible"); return; }
    const url = `${window.location.origin}${j.path}`;
    setShareUrl(url);
    setEditor({ ...editor, devis: j.devis });
    showToast("Lien de signature prêt — envoyez-le au client sur WhatsApp.");
  }

  function factureWhatsAppText(f: any, d: Devis) {
    return `Bonjour ${d.clientNom},\n\nVoici votre *facture d'acompte ${f.numero}* pour les travaux à ${d.lieu} (devis ${d.numero}).\n\nTotal du devis : ${fcfa(f.totalDevisTTC)}\nAcompte (${f.pct} %) : *${fcfa(f.montant)}*\nSolde restant après cet acompte : ${fcfa(f.soldeRestant)}\n\nPaiement possible par Wave / Orange Money au ${entreprise?.telephone || ""}.\nLa facture PDF est disponible sur demande. Merci !\n${entreprise?.nom || ""} — ${entreprise?.proprietaire || ""}`;
  }

  function whatsappText(d: Devis, lignesBase: Ligne[]) {
    const total = fcfa(d.totalTTC || totauxEditor.ttc);
    // Prix clients (marge incluse, sans jamais la mentionner).
    const lignes = lignesClientMode(lignesBase, d.margePct ?? margePct, d.mainOeuvrePct ?? mainOeuvrePct, d.moMode || moMode, equipeDuDevis(d));
    const format = ((d.formatPdf as FormatPdf) || formatPdf || "general");
    const clause = clauseValidite(d.validiteJours ?? validiteJours ?? 30, d.createdAt);
    if (d.materiauxClient || (editor && d.id === editor.devis.id && materiauxClient)) {
      const achats = listeAchatsMateriaux(lignes as any);
      const payable = editor && d.id === editor.devis.id ? totauxEditor.moSeuleTTC : (d.totalMoSeuleTTC || 0);
      return `Bonjour ${d.clientNom},\n\nVoici votre devis *${d.numero}* en *main-d'œuvre seule* — ${entreprise?.nom || "DevisBTP CI"}.\n\n*${d.natureTravaux}*\nChantier : ${d.lieu}\n\n*Matériaux à prévoir par vos soins (quantités, sans prix) :*\n${achats.map((a) => `- ${a.designation} : ${nombre(a.quantite)} ${a.unite}`).join("\n")}\n\n*Main-d'œuvre à payer à l'entrepreneur : ${fcfa(payable)} TTC*\nOffre valable ${clause.jours} jours, jusqu'au ${clause.dateExpiration}.\n\nLe devis PDF est disponible sur demande. Merci de votre confiance !\n${entreprise?.proprietaire || ""} — ${entreprise?.telephone || ""}`;
    }
    let bloc = "";
    if (format === "general") {
      bloc = `Résumé par grandes étapes :\n${resumeParLot(lignes as any).map((r) => `• ${r.nom} : *${fcfa(r.montant)}*`).join("\n")}`;
    } else if (format === "materiaux") {
      bloc = `Résumé par catégories de matériaux :\n${resumeParCategorie(lignes as any).map((r) => `• ${r.nom}${r.quantite ? ` (${nombre(r.quantite)} ${r.unite})` : ""} : *${fcfa(r.montant)}*`).join("\n")}`;
    } else {
      bloc = `Détail complet (extrait) :\n${lignes.slice(0, 8).map(l => `• ${l.designation} : ${nombre(l.quantite)} ${l.unite} × ${fcfa(l.prixUnitaire)}`).join("\n")}\n… (${lignes.length} lignes au total)`;
    }
    return `Bonjour ${d.clientNom},\n\nSuite à votre demande à ${d.lieu}, voici votre devis *${d.numero}* — ${entreprise?.nom || "DevisBTP CI"}.\n\n*${d.natureTravaux}*\n\n${bloc}\n\n*Total TTC : ${total}* (TVA ${d.tvaPct ?? 18} % incluse)\nOffre valable ${clause.jours} jours, jusqu'au ${clause.dateExpiration}.\n\nLe devis PDF est disponible sur demande. Merci de votre confiance !\n${entreprise?.proprietaire || ""} — ${entreprise?.telephone || ""}`;
  }

  function shareWhatsApp(d?: Devis, lignes?: Ligne[]) {
    const target = d || editor?.devis;
    const ls = lignes || editor?.lignes || [];
    if (!target) return;
    // Depuis l'éditeur, les valeurs visibles peuvent ne pas encore être enregistrées.
    const devisAffiche = !d && editor ? {
      ...target, totalTTC: Math.round(totauxEditor.ttc), tvaPct, remisePct, mainOeuvrePct,
      margePct, formatPdf, materiauxClient, validiteJours, moMode,
      moMacons: equipe.macons, moManoeuvres: equipe.manoeuvres, moJours: equipe.jours,
      moTauxMacon: equipe.tauxMacon, moTauxManoeuvre: equipe.tauxManoeuvre,
    } : target;
    demanderDestinataire({ titre: `Envoyer le devis ${devisAffiche.numero}`, texte: whatsappText(devisAffiche, ls), tel: devisAffiche.clientTel || "", nom: devisAffiche.clientNom });
  }

  async function partagerDevisEnregistre() {
    const sauvegarde = await saveEditor(true);
    if (!sauvegarde) return;
    shareWhatsApp(sauvegarde.devis, sauvegarde.lignes);
  }

  async function partagerDevisParId(id: number) {
    try {
      const r = await fetchAvecRecuperation(`/api/devis/${id}`);
      const resultat = await r.json();
      if (!r.ok || !resultat.devis) {
        showToast(resultat.error || "Impossible de préparer ce devis pour WhatsApp.");
        return;
      }
      shareWhatsApp(resultat.devis, resultat.lignes || []);
    } catch {
      showToast("Impossible de charger le devis. Vérifiez votre connexion.");
    }
  }

  // ---------- Habillage PDF : logo, RCCM/CC, signature & cachet de l'entreprise ----------
  function pdfImgFormat(data: string) { return data.includes("image/png") ? "PNG" : "JPEG"; }
  function pdfAddImage(doc: any, data: string, x: number, y: number, w: number, h: number) {
    if (!data) return;
    try { doc.addImage(data, pdfImgFormat(data), x, y, w, h); } catch { /* image illisible : on ignore */ }
  }
  function pdfHeader(doc: any, clean: (s: string) => string, titreDoc: string, numeroDoc: string, dateDoc: string, lieuDoc: string) {
    const W = 210;
    doc.setFillColor(15, 29, 22); doc.rect(0, 0, W, 30, "F");
    doc.setFillColor(255, 122, 0); doc.rect(0, 30, W, 2.2, "F");
    const hasLogo = !!entreprise?.logoData;
    if (hasLogo) pdfAddImage(doc, entreprise.logoData, 14, 6, 18, 18);
    const tx = hasLogo ? 36 : 14;
    doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(15);
    doc.text(clean(entreprise?.nom || "SARL Bâtir Ivoire"), tx, 12);
    doc.setFontSize(7.6); doc.setFont("helvetica", "normal"); doc.setTextColor(210, 220, 214);
    const legal = [entreprise?.rccm ? `RCCM : ${entreprise.rccm}` : "", entreprise?.compteContribuable ? `CC : ${entreprise.compteContribuable}` : ""].filter(Boolean).join("  •  ");
    doc.text(clean(`${entreprise?.adresse || entreprise?.ville || "Abidjan"}  •  ${entreprise?.telephone || ""}  •  ${entreprise?.email || ""}`), tx, 17.5, { maxWidth: 118 });
    if (legal) doc.text(clean(legal), tx, 22);
    doc.text(clean(titreDoc), tx, 26.5);
    doc.setTextColor(255, 255, 255); doc.setFontSize(13); doc.setFont("helvetica", "bold");
    doc.text(clean(numeroDoc), W - 14, 13, { align: "right" });
    doc.setFontSize(8); doc.setFont("helvetica", "normal");
    doc.text(`Date : ${dateDoc}`, W - 14, 19, { align: "right" });
    doc.text(clean(`Lieu : ${lieuDoc}`), W - 14, 24, { align: "right", maxWidth: 60 });
  }
  function pdfSignature(doc: any, clean: (s: string) => string, y: number, clientSig?: { data?: string; nom?: string; date?: string | Date | null }) {
    const W = 210;
    doc.setTextColor(30, 40, 34); doc.setFontSize(8);
    doc.text(clientSig?.data ? "Le client (signé électroniquement)" : "Le client (bon pour accord)", 14, y);
    doc.text(clean(`Pour ${entreprise?.nom || ""}`), W - 14, y, { align: "right" });
    if (entreprise?.proprietaire) { doc.setFontSize(7.5); doc.setTextColor(90, 100, 94); doc.text(clean(entreprise.proprietaire), W - 14, y + 4.5, { align: "right" }); }
    if (clientSig?.data) {
      pdfAddImage(doc, clientSig.data, 16, y + 2, 42, 11);
      doc.setFontSize(7); doc.setTextColor(90, 100, 94);
      doc.text(clean(`${clientSig.nom || ""}${clientSig.date ? ` — le ${new Date(clientSig.date).toLocaleDateString("fr-FR")}` : ""}`), 14, y + 20.5, { maxWidth: 60 });
    }
    // Signature au-dessus du trait, cachet à cheval sur la zone de signature.
    pdfAddImage(doc, entreprise?.signatureData || "", W - 68, y + 2, 42, 11);
    pdfAddImage(doc, entreprise?.cachetData || "", W - 42, y - 3, 27, 27);
    doc.setDrawColor(160, 165, 160); doc.line(14, y + 16, 70, y + 16); doc.line(W - 70, y + 16, W - 14, y + 16);
  }
  function pdfFooter(doc: any, clean: (s: string) => string) {
    const W = 210; const pages = doc.getNumberOfPages();
    const legal = [entreprise?.nom || "", entreprise?.rccm ? `RCCM : ${entreprise.rccm}` : "", entreprise?.compteContribuable ? `CC : ${entreprise.compteContribuable}` : "", entreprise?.adresse || entreprise?.ville || ""].filter(Boolean).join("  •  ");
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i); doc.setFontSize(6.8); doc.setTextColor(150, 155, 150);
      if (legal) doc.text(clean(legal), W / 2, 288, { align: "center", maxWidth: 180 });
      doc.text(`Document généré avec DevisBTP CI  •  Page ${i}/${pages}`, W / 2, 293, { align: "center" });
    }
  }

  async function downloadPDF(d?: Devis, lignesArg?: Ligne[], planningArg?: any[], mode: "download" | "apercu" = "download") {
    if (mode === "apercu") setPdfLoading(true);
    let target = d || editor?.devis; let lignes = lignesArg || editor?.lignes || [];
    if (editor && !d) { const saved = await saveEditor(true); if (saved) { target = saved.devis; lignes = saved.lignes; if (saved.planning) (target as any)._planning = saved.planning; } }
    if (!target) return;
    if (planningArg) (target as any)._planning = planningArg;
    else if (editor && d?.id === editor.devis.id) (target as any)._planning = planning;

    try {
      const client = lignesClientMode(lignes, target.margePct ?? margePct ?? 0, target.mainOeuvrePct ?? mainOeuvrePct ?? NORMES_CI.mainOeuvrePctDefaut, target.moMode || moMode, equipeDuDevis(target));
      const mat = materiauxTotal(client);
      const mo = client.filter((l) => estLigneMainOeuvre(l)).reduce((s, l) => s + l.quantite * l.prixUnitaire, 0);
      const htBrut = mat + mo;
      const remise = htBrut * (target.remisePct ?? remisePct ?? 0) / 100;
      const ht = htBrut - remise;
      const tva = ht * (target.tvaPct ?? tvaPct ?? 18) / 100;
      const ttc = ht + tva;
      const moSeuleHT = Math.max(0, mo - (htBrut ? (remise * mo) / htBrut : 0));
      const moSeuleTTC = moSeuleHT * (1 + (target.tvaPct ?? tvaPct ?? 18) / 100);
      const planningPdf: any[] = (target as any)._planning || planning || [];
      const clause = clauseValidite(target.validiteJours ?? validiteJours ?? 30, target.createdAt).texte;
      const nom = `${target.numero}-${(target.clientNom || "client").replace(/[^\w-]+/g, "-")}_${formatPapier}.pdf`;
      const resultat = await genererPdfDevis({
        apercu: mode === "apercu",
        format: formatPapier,
        entreprise,
        devis: target,
        lignes: client as any,
        planning: planningPdf,
        tot: {
          materiaux: mat, mo, htBrut, remise, ht, tva, ttc,
          tvaPct: target.tvaPct ?? tvaPct ?? 18, remisePct: target.remisePct ?? remisePct ?? 0,
          moLabel: target.moMode === "equipe" ? `équipe ${equipeDuDevis(target).macons + equipeDuDevis(target).manoeuvres} ouvriers × ${equipeDuDevis(target).jours} j` : `${target.mainOeuvrePct ?? mainOeuvrePct ?? 30} %`,
          moSeule: !!target.materiauxClient, moSeuleTTC,
        },
        resume: { lots: resumeParLot(client as any), categories: resumeParCategorie(client as any) },
        achatsClient: listeAchatsMateriaux(client as any),
        clause,
        nomFichier: nom,
        statutSigne: target.signatureClientData ? { data: target.signatureClientData, nom: target.signatureClientNom, date: target.signedAt } : undefined,
      });
      if (mode === "apercu") {
        setPdfApercu({ url: String(resultat), nom });
        showToast("Aperçu prêt : imprimez ou téléchargez depuis la fenêtre.");
      } else {
        showToast(`PDF ${formatPapier} téléchargé — prêt à imprimer ou partager.`);
      }
    } catch (e) {
      console.error("PDF:", e);
      showToast("Le PDF n'a pas pu être généré. Réessayez.");
    } finally { if (mode === "apercu") setPdfLoading(false); }
  }

  async function downloadFacturePDF(f: any, d: Devis) {
    const { default: jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const W = 210;
    const clean = (s: string) => (s || "").replace(/œ/g, "oe").replace(/’/g, "'").replace(/✓/g, "");
    pdfHeader(doc, clean, "FACTURE D'ACOMPTE", f.numero, new Date(f.createdAt || Date.now()).toLocaleDateString("fr-FR"), d.lieu);
    let y = 42;
    doc.setFillColor(255, 122, 0); doc.roundedRect(14, y, W - 28, 16, 2, 2, "F");
    doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(13);
    doc.text(clean(`Acompte de ${f.pct} % — montant à payer : ${fcfa(f.montant)}`), W / 2, y + 10.5, { align: "center" });
    y += 24;
    doc.setFillColor(246, 243, 238); doc.roundedRect(14, y, W - 28, 24, 2, 2, "F");
    doc.setTextColor(20, 35, 26); doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.text("CLIENT", 18, y + 6);
    doc.setFontSize(11); doc.text(clean(d.clientNom), 18, y + 12);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(90, 100, 94);
    doc.text(clean(`${d.clientTel || ""}  •  Chantier : ${d.lieu}`), 18, y + 18);
    doc.text(clean(`Référence devis : ${d.numero}`), W - 18, y + 12, { align: "right" });
    doc.text(clean(`Travaux : ${d.natureTravaux}`), W - 18, y + 18, { align: "right", maxWidth: 85 });
    y += 32;
    doc.setTextColor(30, 40, 34); doc.setFontSize(10); doc.setFont("helvetica", "bold");
    doc.text("Détail de l'acompte", 14, y); y += 4;
    doc.setDrawColor(0, 154, 68); doc.setLineWidth(0.6); doc.line(14, y, W - 14, y); y += 8;
    const rows: [string, string][] = [
      ["Total du devis (TTC)", fcfa(f.totalDevisTTC)],
      [`Acompte demandé (${f.pct} %)`, fcfa(f.montant)],
      ["Déjà facturé (acomptes précédents inclus)", fcfa(f.dejaFacture)],
      ["Solde restant à payer après cet acompte", fcfa(f.soldeRestant)],
    ];
    doc.setFontSize(9.5);
    rows.forEach(([label, val], i) => {
      const isLast = i === rows.length - 1;
      doc.setFont("helvetica", isLast ? "bold" : "normal"); doc.setTextColor(isLast ? 15 : 50, isLast ? 29 : 60, isLast ? 22 : 54);
      doc.text(clean(label), 16, y);
      doc.setFont("helvetica", "bold"); doc.text(val, W - 16, y, { align: "right" });
      y += 4; doc.setDrawColor(232, 232, 226); doc.setLineWidth(0.2); doc.line(14, y, W - 14, y); y += 7;
    });
    y += 2;
    doc.setFillColor(15, 29, 22); doc.roundedRect(110, y, W - 14 - 110, 16, 2, 2, "F");
    doc.setTextColor(255, 255, 255); doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.text("NET À PAYER", 114, y + 6);
    doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.text(fcfa(f.montant), W - 18, y + 11.5, { align: "right" });
    doc.setTextColor(90, 100, 94); doc.setFontSize(8); doc.setFont("helvetica", "normal");
    doc.text(clean(`Paiement par Wave / Orange Money au ${entreprise?.telephone || ""} ou virement.`), 14, y + 6, { maxWidth: 88 });
    doc.text(clean("Cette facture d'acompte vient en déduction du montant total du devis ci-dessus."), 14, y + 12, { maxWidth: 88 });
    y += 30;
    pdfSignature(doc, clean, y);
    pdfFooter(doc, clean);
    doc.save(`${f.numero}-acompte-${clean(d.clientNom).replace(/\s+/g, "-")}.pdf`);
    showToast("Facture d'acompte téléchargée.");
  }

  async function downloadAvenantPDF(a: any, d: Devis, lignesA?: Ligne[]) {
    try {
      const lignesPdf: Ligne[] = lignesA || a.lignes || avLignes;
      const signesAvant = avenants.filter((x) => x.statut === "signe" && x.id !== a.id).reduce((sum, x) => sum + x.totalTTC, 0);
      const nom = `${(a.numero || "avenant").replace(/[^\w-]+/g, "-")}-${(d.clientNom || "client").replace(/[^\w-]+/g, "-")}_${formatPapier}.pdf`;
      await genererPdfAvenant({ format: formatPapier, entreprise, avenant: a, devis: d, lignes: lignesPdf as any, nomFichier: nom, signesAvant });
      showToast("PDF de l'avenant téléchargé.");
    } catch (e) { console.error(e); showToast("PDF impossible, réessayez."); }
  }

  function ouvrirPaiement(offre: string, moyen: "Wave" | "Orange Money") {
    const cfg = OFFRES_PAIEMENT[offre];
    if (!cfg) return;
    // Ouvre le lien de paiement exact dans un nouvel onglet et affiche aussitôt le formulaire d'activation.
    window.open(moyen === "Wave" ? cfg.wave : cfg.orangeMoney, "_blank", "noopener,noreferrer");
    setActivationDone(null); setActivationError("");
    setActivationForm({ transactionId: "", telephone: entreprise?.telephone || "" });
    setActivationModal({ offre, moyen });
  }

  async function activerCredits() {
    if (!activationModal) return;
    setActivating(true); setActivationError("");
    try {
      const r = await fetchAvecRecuperation("/api/credits/activate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ offre: activationModal.offre, moyen: activationModal.moyen, transactionId: activationForm.transactionId, telephone: activationForm.telephone }) });
      const d = await r.json();
      if (!r.ok) { setActivationError(d.error || "Activation impossible"); return; }
      setEntreprise(d.entreprise); setActivationDone(d);
      showToast(d.message);
    } catch { setActivationError("Connexion impossible au serveur. Réessayez."); } finally { setActivating(false); }
  }

  async function appliquerCodeFondateur() {
    if (!codeFondateur.trim()) { showToast("Entrez le code fondateur / collaborateur."); return; }
    const r = await fetchAvecRecuperation("/api/credits/redeem", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: codeFondateur }) });
    const d = await r.json();
    if (!r.ok) { showToast(d.error || "Code invalide"); return; }
    setEntreprise(d.entreprise); setCodeFondateur("");
    showToast(d.message);
  }

  const filtered = devisList.filter(d => {
    const okS = filtreStatut === "tous" || d.statut === filtreStatut;
    const q = search.toLowerCase();
    return okS && (!q || d.clientNom.toLowerCase().includes(q) || d.lieu.toLowerCase().includes(q) || d.numero.toLowerCase().includes(q));
  });

  if (authChecked && !compte) return <AuthScreen onAuth={apresConnexion} />;

  if (loading) return (
    <div className="min-h-screen bg-[#F8FAFC] grid place-items-center px-6">
      <div className="text-center">
        <img src="/icons/icon-192.png" alt="DevisBTP CI" className="w-16 h-16 rounded-2xl mx-auto shadow-xl shadow-amber-200 ring-1 ring-slate-200" />
        <p className="text-[#0F172A] font-extrabold mt-4 text-[17px] tracking-tight">DevisBTP <span className="text-[#D97706]">CI</span></p>
        <p className="text-slate-400 text-[13px] mt-1 animate-pulseSoft">Ouverture de votre espace chantier…</p>
      </div>
    </div>
  );

  // ---------- VUE ÉDITEUR ----------
  if (editor) {
    const d = editor.devis;
    return (
      <div className="min-h-screen bg-[#F8FAFC] pb-40 text-[#0F172A]">
        <header className="sticky top-0 z-30 bg-white/92 backdrop-blur-xl border-b border-slate-200 px-4 py-3 shadow-[0_10px_30px_-20px_rgb(15_23_42/.35)]">
          <div className="max-w-6xl mx-auto flex items-center gap-3">
            <button onClick={() => setEditor(null)} className="w-10 h-10 grid place-items-center rounded-2xl bg-slate-100 text-slate-700 shrink-0 active:scale-95 transition" aria-label="Retour"><ArrowLeft size={19} /></button>
            <div className="min-w-0 flex-1">
              <p className="font-extrabold truncate tracking-tight">{d.numero} — {d.clientNom}</p>
              <p className="text-xs text-slate-500 truncate flex items-center gap-1 mt-0.5"><MapPin size={11} /> {d.lieu} • {dateFr(d.createdAt)} {d.photoPlanNom ? `• Plan : ${d.photoPlanNom}` : ""}</p>
            </div>
            <span className={`hidden min-[420px]:inline-flex text-[11px] font-extrabold px-2.5 py-1.5 rounded-full items-center gap-1.5 shrink-0 ${(STATUT[d.statut] || STATUT.brouillon).cls}`}><span className={`w-1.5 h-1.5 rounded-full ${(STATUT[d.statut] || STATUT.brouillon).dot}`} />{(STATUT[d.statut] || STATUT.brouillon).label}</span>
            <select value={d.statut} onChange={e => { const statut = e.target.value; setEditor({ ...editor, devis: { ...d, statut } }); if (statut === "signe") fetch(`/api/devis/${d.id}/depenses`).then((x) => x.json()).then((j) => setDepenses(j.depenses || [])).catch(() => {}); }} className="bg-white border border-slate-300 text-slate-800 text-xs font-bold rounded-xl px-2 py-2.5 max-w-[112px] shadow-sm">
              <option value="brouillon">Brouillon</option><option value="pret">Prêt</option><option value="envoye">Envoyé</option><option value="signe">Validé</option>
            </select>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-3 sm:px-5 py-4 sm:py-6 space-y-4 animate-fadeUp">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Nature des travaux</p>
            <p className="font-medium mt-1 text-[15px] leading-snug">{d.natureTravaux}</p>
            <div className="flex flex-wrap gap-2 mt-3 text-xs">
              <span className="bg-orange-50 text-orange-700 border border-orange-100 rounded-full px-2.5 py-1 font-semibold">{d.surface} m² au sol</span>
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full px-2.5 py-1 font-semibold">{d.nbPieces} pièces • {d.nbEtages} étage(s)</span>
              {d.photoPlanNom && <span className="bg-blue-50 text-blue-700 border border-blue-100 rounded-full px-2.5 py-1 font-semibold flex items-center gap-1"><Eye size={12} /> Plan analysé par IA</span>}
            </div>
            <p className="text-xs text-slate-500 mt-3 flex items-start gap-1.5"><Sparkles size={14} className="text-[#F59E0B] shrink-0 mt-0.5" /> DQE généré selon les normes CI (détails de calcul sous chaque ligne). Modifiez quantités et prix : matériaux, main-d'œuvre ({mainOeuvrePct} %) et totaux se recalculent instantanément.</p>
            {d.materiauxClient && <span className="inline-flex mt-2.5 text-[11px] font-extrabold bg-teal-600 text-white px-2.5 py-1 rounded-full">MODE MAIN-D'ŒUVRE SEULE — matériaux fournis par le client</span>}
          </div>

          {/* Onglets de l'éditeur : Devis / Dépenses réelles (si Validé) */}
          {d.statut === "signe" && (
            <div className="grid grid-cols-2 gap-1.5 bg-slate-200/70 p-1.5 rounded-2xl" role="tablist">
              <button role="tab" aria-selected={editorTab === "devis"} onClick={() => setEditorTab("devis")} className={`py-3 rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 transition ${editorTab === "devis" ? "bg-white shadow text-[#0F172A]" : "text-slate-500"}`}><FileText size={16} /> Devis</button>
              <button role="tab" aria-selected={editorTab === "depenses"} onClick={() => setEditorTab("depenses")} className={`py-3 rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 transition ${editorTab === "depenses" ? "bg-white shadow text-[#0F172A]" : "text-slate-500"}`}><Wallet size={16} /> Dépenses réelles {depenses.length > 0 && <span className="bg-[#F59E0B] text-white text-[10px] px-1.5 py-0.5 rounded-full">{depenses.length}</span>}</button>
            </div>
          )}

          {d.statut === "signe" && editorTab === "depenses" && (
            <section className="card rounded-[1.75rem] p-4 sm:p-5 animate-scaleIn">
              <h3 className="font-extrabold flex items-center gap-2"><Wallet className="text-[#D97706]" size={19} /> Dépenses réelles du chantier</h3>
              <p className="text-[13px] text-slate-500 mt-1">Enregistrez chaque achat effectué. La marge nette restante se recalcule par rapport au devis initial ({fcfa(totauxEditor.ht)} HT).</p>

              <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3"><p className="text-[10px] font-extrabold text-slate-400">DEVIS INITIAL (HT)</p><p className="font-extrabold tnum mt-1 text-[15px]">{fcfa(totauxEditor.ht)}</p><p className="text-[10px] text-slate-400">{fcfa(totauxEditor.ttc)} TTC</p></div>
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3"><p className="text-[10px] font-extrabold text-amber-600">DÉPENSES RÉELLES</p><p className="font-extrabold tnum mt-1 text-[15px] text-[#B45309]">{fcfa(totalDepensesEditor)}</p><p className="text-[10px] text-amber-600">{totauxEditor.ht ? Math.round((totalDepensesEditor / totauxEditor.ht) * 100) : 0} % du devis</p></div>
                <div className={`rounded-2xl p-3 border ${totauxEditor.ht - totalDepensesEditor >= 0 ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
                  <p className={`text-[10px] font-extrabold ${totauxEditor.ht - totalDepensesEditor >= 0 ? "text-emerald-600" : "text-red-600"}`}>MARGE NETTE RESTANTE</p>
                  <p className={`font-extrabold tnum mt-1 text-[15px] ${totauxEditor.ht - totalDepensesEditor >= 0 ? "text-emerald-700" : "text-red-700"}`}>{fcfa(totauxEditor.ht - totalDepensesEditor)}</p>
                  <p className="text-[10px] text-slate-400">devis HT − dépenses</p>
                </div>
              </div>
              <div className="h-2.5 bg-slate-100 rounded-full mt-3 overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${totalDepensesEditor > totauxEditor.ht ? "bg-red-500" : "bg-[#F59E0B]"}`} style={{ width: `${Math.min(100, totauxEditor.ht ? (totalDepensesEditor / totauxEditor.ht) * 100 : 0)}%` }} />
              </div>
              {totalDepensesEditor > totauxEditor.ht && <p className="text-[12px] font-bold text-red-600 mt-2">Attention : les dépenses dépassent le montant HT du devis — marge nette négative.</p>}
              <p className="text-[11px] text-slate-400 mt-2">Repère prix de revient estimé au devis : {fcfa(totauxEditor.htBase)} HT (avant marge secrète). Écart dépenses / budget : <b className={totalDepensesEditor - totauxEditor.htBase > 0 ? "text-red-600" : "text-emerald-600"}>{totalDepensesEditor - totauxEditor.htBase >= 0 ? "+" : ""}{fcfa(totalDepensesEditor - totauxEditor.htBase)}</b>.</p>

              <div className="bg-[#F8FAFC] border border-slate-200 rounded-2xl p-3.5 mt-4">
                <p className="text-xs font-extrabold text-slate-500">AJOUTER UN ACHAT</p>
                <div className="flex gap-2 overflow-x-auto no-scrollbar mt-2">
                  {["Ciment", "Fer à béton", "Sable / gravier", "Agglos", "Carrelage", "Transport", "Location matériel", "Main-d'œuvre payée", "Divers"].map((c) => (
                    <button key={c} onClick={() => setDepenseForm({ ...depenseForm, libelle: c })} className="shrink-0 bg-white border border-slate-200 text-slate-600 text-[11px] font-bold px-2.5 py-1.5 rounded-full">{c}</button>
                  ))}
                </div>
                <div className="grid grid-cols-[1fr_auto] gap-2 mt-2.5">
                  <input value={depenseForm.libelle} onChange={(e) => setDepenseForm({ ...depenseForm, libelle: e.target.value })} placeholder="Libellé (ex : 40 sacs de ciment Sococim)" className="border-2 border-slate-200 rounded-xl px-3.5 py-3 font-medium outline-none focus:border-[#F59E0B] min-w-0" />
                  <input type="date" value={depenseForm.dateDepense} onChange={(e) => setDepenseForm({ ...depenseForm, dateDepense: e.target.value })} className="border-2 border-slate-200 rounded-xl px-3 py-3 font-medium outline-none text-slate-500" />
                </div>
                <div className="grid grid-cols-[1fr_auto] gap-2 mt-2">
                  <div className="relative">
                    <input type="number" min={0} value={depenseForm.montant} onChange={(e) => setDepenseForm({ ...depenseForm, montant: e.target.value })} placeholder="Montant payé" className="w-full border-2 border-slate-200 rounded-xl px-3.5 py-3 font-extrabold outline-none focus:border-[#F59E0B] tnum" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400">FCFA</span>
                  </div>
                  <button onClick={addDepense} className="bg-[#F59E0B] hover:bg-[#D97706] text-white font-extrabold px-5 rounded-xl flex items-center gap-1.5 active:scale-[.98] transition"><Plus size={17} /> Ajouter</button>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {depenses.length === 0 && <p className="text-sm text-slate-400 text-center py-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">Aucune dépense enregistrée pour le moment.<br />Ajoutez votre premier achat ci-dessus.</p>}
                {depenses.map((dep) => (
                  <div key={dep.id} className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl px-3.5 py-3">
                    <span className="bg-amber-100 text-[#B45309] w-9 h-9 rounded-xl grid place-items-center shrink-0"><ShoppingCart size={16} /></span>
                    <div className="flex-1 min-w-0"><p className="font-bold text-sm truncate">{dep.libelle}</p><p className="text-[11px] text-slate-400">{dep.dateDepense ? new Date(dep.dateDepense).toLocaleDateString("fr-FR") : dateFr(dep.createdAt)}</p></div>
                    <b className="tnum whitespace-nowrap">− {fcfa(dep.montant)}</b>
                    <button onClick={() => deleteDepense(dep)} className="text-red-500 bg-red-50 p-2 rounded-lg shrink-0" aria-label="Supprimer"><Trash2 size={15} /></button>
                  </div>
                ))}
              </div>
              {depenses.length > 0 && <p className="text-[12px] text-slate-400 mt-3 text-center">{depenses.length} dépense(s) • Marge nette restante : <b className={totauxEditor.ht - totalDepensesEditor >= 0 ? "text-emerald-600" : "text-red-600"}>{fcfa(totauxEditor.ht - totalDepensesEditor)}</b></p>}
            </section>
          )}

          {editorTab === "devis" && (<>
          {/* Aperçu & export : sélecteur de format PDF en temps réel */}
          <section className="card rounded-[1.75rem] p-4 sm:p-5 animate-scaleIn">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-extrabold flex items-center gap-2"><LayoutTemplate className="text-[#D97706]" size={19} /> Aperçu & export PDF</h3>
              <span className="text-[11px] font-extrabold bg-amber-100 text-amber-800 rounded-full px-2.5 py-1">Temps réel</span>
            </div>
            <p className="text-[13px] text-slate-500 mt-1">Choisissez exactement ce que votre client verra. L'aperçu, le PDF téléchargé et le message WhatsApp s'adaptent instantanément.</p>

            {/* Mode main-d'œuvre seule */}
            <label className={`mt-3 flex items-start gap-3 rounded-2xl border-2 p-3.5 cursor-pointer transition ${materiauxClient ? "bg-teal-50 border-teal-500" : "bg-slate-50 border-slate-200"}`}>
              <input type="checkbox" checked={materiauxClient} onChange={(e) => { setMateriauxClient(e.target.checked); setEditor({ ...editor, devis: { ...d, materiauxClient: e.target.checked } }); }} className="mt-0.5 w-6 h-6 accent-teal-600 shrink-0" />
              <span className="flex-1">
                <b className="text-sm flex items-center gap-2">Matériaux fournis par le client <span className="text-[10px] bg-teal-600 text-white font-extrabold px-2 py-0.5 rounded-full">MAIN-D'ŒUVRE SEULE</span></b>
                <span className="block text-[12px] text-slate-500 mt-0.5 leading-snug">Le PDF client listera les quantités de matériaux à prévoir <b>sans aucun prix</b> et ne facturera que la main-d'œuvre : <b className="text-teal-700">{fcfa(totauxEditor.moSeuleTTC)} TTC à payer</b> (au lieu de {fcfa(totauxEditor.ttc)} matériaux inclus).</span>
              </span>
            </label>

            <div className={`grid grid-cols-3 gap-1.5 bg-slate-100 p-1.5 rounded-2xl mt-3 ${materiauxClient ? "opacity-40 pointer-events-none" : ""}`} role="tablist" aria-label="Format du PDF">
              {FORMATS_PDF.map((f) => (
                <button key={f.id} role="tab" aria-selected={formatPdf === f.id} onClick={() => { setFormatPdf(f.id); setEditor({ ...editor, devis: { ...d, formatPdf: f.id } }); }}
                  className={`rounded-xl px-2 py-2.5 text-left transition active:scale-[.98] ${formatPdf === f.id ? "bg-white shadow-md ring-1 ring-amber-300" : "text-slate-500"}`}>
                  <span className={`block text-[12px] font-extrabold leading-tight ${formatPdf === f.id ? "text-[#B45309]" : ""}`}>{f.id === "general" ? "A · Général" : f.id === "materiaux" ? "B · Matériaux" : "C · DQE Complet"}</span>
                  <span className="block text-[10px] leading-tight mt-0.5 text-slate-400">{f.id === "general" ? "Recommandé client" : f.id === "materiaux" ? "Sans détails" : "Tout le détail"}</span>
                </button>
              ))}
            </div>

            {/* Feuille d'aperçu */}
            <div className="mt-4 bg-slate-200/70 rounded-2xl p-2.5 sm:p-3">
              <div className="bg-white rounded-xl shadow-[0_18px_40px_-20px_rgb(15_23_42/.35)] overflow-hidden max-h-[430px] overflow-y-auto">
                <div className="bg-[#0F172A] text-white px-4 py-3 flex items-center gap-2.5 sticky top-0 z-10">
                  {entreprise?.logoData ? <img src={entreprise.logoData} alt="" className="w-8 h-8 object-contain bg-white rounded-lg" /> : <span className="bg-[#F59E0B] w-8 h-8 rounded-lg grid place-items-center shrink-0"><Building2 size={16} /></span>}
                  <div className="min-w-0 flex-1"><p className="font-extrabold text-[13px] truncate">{entreprise?.nom}</p><p className="text-[10px] text-white/60 truncate">{d.numero} • {d.clientNom} • {d.lieu}</p></div>
                  <span className="text-[10px] font-extrabold bg-white/10 rounded-full px-2 py-1 shrink-0">{materiauxClient ? "MAIN-D'ŒUVRE SEULE" : formatPdf === "general" ? "GÉNÉRAL" : formatPdf === "materiaux" ? "MATÉRIAUX" : "DQE COMPLET"}</span>
                </div>
                <div className="p-4">
                  {(() => {
                    const client = lignesClientMode(editor.lignes, margePct, mainOeuvrePct, moMode, equipe);
                    const total = client.reduce((s, l) => s + l.quantite * l.prixUnitaire, 0) || 1;
                    if (materiauxClient) return (
                      <div>
                        <p className="text-[11px] font-extrabold text-teal-700">MATÉRIAUX À FOURNIR PAR LE CLIENT — QUANTITÉS SANS PRIX</p>
                        <div className="divide-y divide-slate-100 mt-1">
                          {listeAchatsMateriaux(client as any).slice(0, 9).map((a, i) => (
                            <div key={i} className="py-1.5 flex justify-between gap-2 text-[12.5px]"><span className="font-semibold">{a.designation}</span><b className="tnum whitespace-nowrap">{nombre(a.quantite)} {a.unite}</b></div>
                          ))}
                        </div>
                        <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 mt-3">
                          <div className="flex justify-between text-[13px]"><span>Main-d'œuvre HT</span><b className="tnum">{fcfa(totauxEditor.moSeuleHT)}</b></div>
                          <div className="flex justify-between text-[15px] border-t border-teal-200 pt-1.5 mt-1"><span className="font-extrabold">À payer à l'entrepreneur</span><b className="tnum text-teal-700">{fcfa(totauxEditor.moSeuleTTC)} TTC</b></div>
                        </div>
                      </div>
                    );
                    if (formatPdf === "general") return (
                      <div className="space-y-2">
                        <p className="text-[11px] font-extrabold text-slate-400">RÉSUMÉ PAR GRANDES ÉTAPES</p>
                        {resumeParLot(client as any).map((r, i) => (
                          <div key={r.nom} className="flex items-center gap-2.5">
                            <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 grid place-items-center text-[10px] font-extrabold shrink-0">{i + 1}</span>
                            <div className="flex-1 min-w-0"><div className="flex justify-between gap-2 text-[13px]"><span className="font-bold truncate">{r.nom}</span><b className="tnum">{fcfa(r.montant)}</b></div>
                              <div className="h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden"><div className="h-full bg-[#F59E0B] rounded-full transition-all duration-500" style={{ width: `${Math.round((r.montant / total) * 100)}%` }} /></div></div>
                          </div>
                        ))}
                        <p className="text-[11px] text-slate-400 pt-1">Aucune quantité unitaire ni détail technique dans cette version.</p>
                      </div>
                    );
                    if (formatPdf === "materiaux") return (
                      <div>
                        <p className="text-[11px] font-extrabold text-slate-400">TOTAUX PAR CATÉGORIES</p>
                        <div className="divide-y divide-slate-100 mt-1">
                          {resumeParCategorie(client as any).map((r) => (
                            <div key={r.nom} className="py-2 flex justify-between gap-2 text-[13px]"><span className="font-bold">{r.nom}{r.quantite ? <span className="block text-[11px] text-slate-400 font-medium">{nombre(r.quantite)} {r.unite}</span> : null}</span><b className="tnum">{fcfa(r.montant)}</b></div>
                          ))}
                        </div>
                        <p className="text-[11px] text-slate-400">Sans ratios ni sous-détails de calcul.</p>
                      </div>
                    );
                    return (
                      <div>
                        <p className="text-[11px] font-extrabold text-slate-400">DQE COMPLET — {client.length} LIGNES</p>
                        <div className="divide-y divide-slate-100 mt-1">
                          {client.slice(0, 10).map((l, i) => (
                            <div key={i} className="py-1.5 flex justify-between gap-2 text-[12px]"><span className="min-w-0"><b className="block truncate">{l.designation}</b><span className="text-slate-400">{nombre(l.quantite)} {l.unite} × {fcfa(l.prixUnitaire)}</span></span><b className="tnum whitespace-nowrap">{fcfa(l.quantite * l.prixUnitaire)}</b></div>
                          ))}
                        </div>
                        {client.length > 10 && <p className="text-[11px] text-slate-400 pt-1.5">… et {client.length - 10} lignes supplémentaires dans le PDF.</p>}
                      </div>
                    );
                  })()}
                  {!materiauxClient && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mt-3 text-[13px] space-y-1">
                    <div className="flex justify-between"><span>Total HT</span><b className="tnum">{fcfa(totauxEditor.htBrut)}</b></div>
                    <div className="flex justify-between"><span>TVA {tvaPct} %</span><b className="tnum">{fcfa(totauxEditor.tva)}</b></div>
                    <div className="flex justify-between text-[15px] border-t border-slate-200 pt-1.5"><span className="font-extrabold">Total TTC</span><b className="tnum text-[#B45309]">{fcfa(totauxEditor.ttc)}</b></div>
                    <p className="text-[11px] text-slate-400 pt-1">Planning : {totalPlanning} jours ouvrés • Offre valable {validiteJours} jours (jusqu'au {clauseValidite(validiteJours, d.createdAt).dateExpiration})</p>
                  </div>
                  )}
                  {materiauxClient && <p className="text-[11px] text-slate-400 mt-2">Planning : {totalPlanning} jours ouvrés • Offre valable {validiteJours} jours (jusqu'au {clauseValidite(validiteJours, d.createdAt).dateExpiration})</p>}
                </div>
              </div>
            </div>
            {/* Format papier A4 / A3 */}
            <div className="mt-3">
              <p className="text-[11px] font-extrabold text-slate-400">FORMAT DU PAPIER</p>
              <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1.5 rounded-2xl mt-1.5">
                {([["A4", "A4 — 210×297 mm"], ["A3", "A3 — 297×420 mm"]] as [FormatPapier, string][]).map(([f, label]) => (
                  <button key={f} onClick={() => setFormatPapier(f)} className={`py-2.5 rounded-xl font-extrabold text-[13px] flex items-center justify-center gap-1.5 transition active:scale-[.98] ${formatPapier === f ? "bg-white shadow ring-1 ring-amber-300 text-[#B45309]" : "text-slate-500"}`}>
                    <FileText size={15} /> {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <button onClick={() => downloadPDF()} className="bg-[#F59E0B] hover:bg-[#D97706] text-white font-extrabold py-3.5 rounded-2xl flex items-center justify-center gap-2 text-sm shadow-lg shadow-amber-200 active:scale-[.98] transition"><Download size={17} /> PDF {formatPapier}</button>
              <button onClick={partagerDevisEnregistre} disabled={saving} className="bg-[#22C55E] hover:bg-[#16A34A] text-white font-extrabold py-3.5 rounded-2xl flex items-center justify-center gap-2 text-sm shadow-lg shadow-emerald-200 active:scale-[.98] transition disabled:opacity-60"><MessageCircle size={17} /> WhatsApp (même format)</button>
            </div>
            <button onClick={() => downloadPDF(undefined, undefined, undefined, "apercu")} disabled={pdfLoading} className="mt-2 w-full bg-white border-2 border-slate-300 text-slate-700 font-extrabold py-3 rounded-2xl flex items-center justify-center gap-2 text-sm active:scale-[.98] transition disabled:opacity-60">
              <Printer size={16} /> {pdfLoading ? "Préparation du PDF…" : `Imprimer / Aperçu du PDF (${formatPapier})`}
            </button>
          </section>

          {sectionsEditor.map(([section, ls]) => (
            <section key={section} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="bg-[#0F172A] text-white px-4 py-2.5 flex justify-between items-center gap-2"><h3 className="font-bold text-[13px] uppercase tracking-wide truncate">{section}</h3><span className="font-bold text-[13px] whitespace-nowrap">{fcfa(ls.reduce((s, l) => s + l.quantite * l.prixUnitaire, 0))}</span></div>
              <div className="divide-y divide-slate-100">
                {ls.map((l, idx) => {
                  const globalIdx = editor.lignes.indexOf(l);
                  if (estLigneMainOeuvre(l)) {
                    return (
                      <div key={idx} className="p-4 bg-orange-50/70">
                        <div className="flex items-start gap-2">
                          <span className="bg-[#F59E0B] text-white p-2 rounded-xl shrink-0"><HardHat size={17} /></span>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-[14px] leading-snug">{l.designation}</p>
                            <p className="text-xs text-slate-600 mt-0.5 leading-snug">{moMode === "equipe"
                              ? <>Simulateur d'équipe : <b>{equipe.macons} maçon(s) × {equipe.jours} j × {fcfa(equipe.tauxMacon)} + {equipe.manoeuvres} manœuvre(s) × {equipe.jours} j × {fcfa(equipe.tauxManoeuvre)}</b> = {fcfa(totauxEditor.moBase)} (hors marge).</>
                              : <>Calculée automatiquement : <b>{mainOeuvrePct} % du total des matériaux</b> ({fcfa(totauxEditor.materiaux)}). Elle se met à jour dès que vous modifiez une quantité ou un prix.</>}</p>
                          </div>
                          <span className="font-extrabold text-[#B45309] whitespace-nowrap">{fcfa(totauxEditor.mo)}</span>
                        </div>
                        {moMode === "pct" ? (
                          <>
                            <div className="flex items-center gap-3 mt-3.5 bg-white border border-orange-200 rounded-2xl px-3.5 py-3">
                              <span className="text-xs font-bold text-slate-600 shrink-0">Ajuster le %</span>
                              <input type="range" min={0} max={60} step={1} value={mainOeuvrePct} onChange={(e) => changeMainOeuvrePct(Number(e.target.value))} className="flex-1 accent-[#F59E0B] min-w-0" />
                              <div className="flex items-center border rounded-xl overflow-hidden shrink-0">
                                <input type="number" min={0} max={100} value={mainOeuvrePct} onChange={(e) => changeMainOeuvrePct(Number(e.target.value))} className="w-14 text-center py-2 font-extrabold outline-none" />
                                <span className="pr-2.5 font-bold text-slate-500 text-sm">%</span>
                              </div>
                            </div>
                            <div className="flex gap-1.5 mt-2.5">
                              {[15, 20, 25, 30, 35, 40].map((p) => (
                                <button key={p} onClick={() => changeMainOeuvrePct(p)} className={`flex-1 text-xs font-bold py-1.5 rounded-lg border ${mainOeuvrePct === p ? "bg-[#F59E0B] text-white border-[#F59E0B]" : "bg-white text-slate-600 border-slate-200"}`}>{p} %</button>
                              ))}
                            </div>
                          </>
                        ) : (
                          <p className="text-[11px] text-slate-500 mt-2.5 bg-white border border-orange-200 rounded-xl px-3 py-2">Ajustez l'équipe dans le simulateur ci-dessous (maçons, manœuvres, jours) — le montant se recalcule automatiquement.</p>
                        )}
                      </div>
                    );
                  }
                  return (
                    <div key={idx} className="p-3.5">
                      <div className="flex gap-2"><div className="flex-1 min-w-0"><p className="font-semibold text-[14px] leading-snug">{l.designation}</p>{l.detail ? <p className="text-xs text-slate-500 mt-0.5 leading-snug">{l.detail}</p> : null}</div>
                        <button onClick={() => updateEditorLignes(editor.lignes.filter((_, i) => i !== globalIdx))} className="text-red-500 p-1.5 h-fit bg-red-50 rounded-lg" aria-label="Supprimer la ligne"><Trash2 size={15} /></button></div>
                      <div className="grid grid-cols-[1fr_1fr_auto] gap-2 mt-2.5 items-end">
                        <label className="block"><span className="text-[11px] font-bold text-slate-500">QTÉ ({l.unite})</span>
                          <div className="flex items-center border rounded-xl overflow-hidden mt-1"><button className="px-2.5 py-2 bg-slate-50 font-bold" onClick={() => { const nl = [...editor.lignes]; nl[globalIdx] = { ...l, quantite: Math.max(0, Math.round((l.quantite - (l.quantite >= 100 ? 10 : 1)) * 10) / 10) }; updateEditorLignes(nl); }}>−</button>
                            <input type="number" value={l.quantite} onChange={e => { const nl = [...editor.lignes]; nl[globalIdx] = { ...l, quantite: Number(e.target.value) }; updateEditorLignes(nl); }} className="w-full text-center py-2 font-semibold outline-none min-w-0" />
                            <button className="px-2.5 py-2 bg-slate-50 font-bold" onClick={() => { const nl = [...editor.lignes]; nl[globalIdx] = { ...l, quantite: Math.round((l.quantite + (l.quantite >= 100 ? 10 : 1)) * 10) / 10 }; updateEditorLignes(nl); }}>+</button></div></label>
                        <label className="block"><span className="text-[11px] font-bold text-slate-500">PRIX UNIT. FCFA {margePct > 0 && <span className="text-slate-400 font-semibold">(revient)</span>}</span>
                          <input type="number" value={l.prixUnitaire} onChange={e => { const nl = [...editor.lignes]; nl[globalIdx] = { ...l, prixUnitaire: Number(e.target.value) }; updateEditorLignes(nl); }} className="w-full border rounded-xl px-2.5 py-2.5 mt-1 font-semibold outline-none focus:border-[#F59E0B]" />
                          {margePct > 0 && <span className="text-[11px] text-emerald-700 font-bold block mt-1">Client : {fcfa(prixAvecMarge(l.prixUnitaire, margePct))} / {l.unite}</span>}</label>
                        <div className="text-right pb-1"><span className="text-[11px] font-bold text-slate-500 block">TOTAL</span><span className="font-extrabold text-[#0F172A] text-[14px] whitespace-nowrap">{fcfa(l.quantite * l.prixUnitaire)}</span></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}

          {/* Ajouter une ligne */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border-2 border-dashed border-slate-200">
            <p className="font-bold text-sm flex items-center gap-2"><Plus size={16} className="text-[#F59E0B]" /> Ajouter une ligne au devis</p>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <select value={newLine.section} onChange={e => setNewLine({ ...newLine, section: e.target.value })} className="border rounded-xl px-2.5 py-2.5 bg-white col-span-2 sm:col-span-1">
                {[...sectionsEditor.map(s => s[0]), "Divers"].filter((v, i, a) => a.indexOf(v) === i).map(s => <option key={s}>{s}</option>)}
              </select>
              <input placeholder="Désignation (ex : Porte métallique)" value={newLine.designation} onChange={e => setNewLine({ ...newLine, designation: e.target.value })} className="border rounded-xl px-3 py-2.5 col-span-2 sm:col-span-1 outline-none focus:border-[#F59E0B]" />
              <input type="number" placeholder="Qté" value={newLine.quantite || ""} onChange={e => setNewLine({ ...newLine, quantite: Number(e.target.value) })} className="border rounded-xl px-3 py-2.5 outline-none" />
              <input type="number" placeholder="Prix unitaire FCFA" value={newLine.prixUnitaire || ""} onChange={e => setNewLine({ ...newLine, prixUnitaire: Number(e.target.value) })} className="border rounded-xl px-3 py-2.5 outline-none" />
            </div>
            <button disabled={!newLine.designation.trim() || newLine.section === "Main-d'œuvre"} onClick={() => { updateEditorLignes([...editor.lignes, { ...newLine, unite: "u", detail: "Ligne ajoutée manuellement" }]); setNewLine({ section: newLine.section, designation: "", quantite: 1, prixUnitaire: 0, unite: "u" }); }} className="mt-3 w-full bg-slate-900 text-white font-bold py-2.5 rounded-xl disabled:opacity-40">Ajouter la ligne</button>
            {newLine.section === "Main-d'œuvre" && <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mt-2">La main-d'œuvre est gérée automatiquement ci-dessus (pourcentage des matériaux) — choisissez une autre section pour une ligne manuelle.</p>}
          </div>

          {/* Main-d'œuvre, remise, TVA, notes */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 grid grid-cols-2 gap-3">
            {/* Marge secrète — visible uniquement par l'entrepreneur */}
            <div className="col-span-2 bg-slate-900 text-white rounded-2xl p-3.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-extrabold flex items-center gap-1.5"><Lock size={14} className="text-[#FCD34D]" /> MARGE ET IMPRÉVUS (%) — SECRET</span>
                <span className="text-[10px] font-bold bg-white/10 border border-white/15 rounded-full px-2 py-1 flex items-center gap-1"><EyeOff size={11} /> Invisible sur le PDF client</span>
              </div>
              <div className="flex items-center gap-3 mt-3">
                <input type="range" min={0} max={50} step={1} value={margePct} onChange={(e) => setMargePct(Number(e.target.value))} className="flex-1 accent-[#F59E0B] min-w-0" />
                <div className="flex items-center bg-white text-slate-900 rounded-xl overflow-hidden shrink-0">
                  <input type="number" min={0} max={100} value={margePct} onChange={(e) => setMargePct(Math.min(100, Math.max(0, Number(e.target.value))))} className="w-14 text-center py-2 font-extrabold outline-none" />
                  <span className="pr-2.5 font-bold text-slate-500 text-sm">%</span>
                </div>
              </div>
              <div className="flex gap-1.5 mt-2.5">
                {[0, 10, 15, 20, 25, 30].map((p) => (
                  <button key={p} onClick={() => setMargePct(p)} className={`flex-1 text-xs font-bold py-1.5 rounded-lg border ${margePct === p ? "bg-[#F59E0B] text-white border-[#F59E0B]" : "bg-white/10 text-white border-white/15"}`}>{p} %</button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                <div className="bg-white/5 rounded-xl py-2 px-1"><p className="text-[10px] text-white/60 font-bold">VOTRE PRIX DE REVIENT HT</p><p className="font-extrabold text-[13px] mt-0.5">{fcfa(totauxEditor.htBase)}</p></div>
                <div className="bg-emerald-400/10 rounded-xl py-2 px-1"><p className="text-[10px] text-emerald-300 font-bold">VOTRE MARGE</p><p className="font-extrabold text-[13px] mt-0.5 text-emerald-300">+ {fcfa(totauxEditor.montantMarge)}</p></div>
                <div className="bg-white/5 rounded-xl py-2 px-1"><p className="text-[10px] text-white/60 font-bold">PRIX CLIENT HT</p><p className="font-extrabold text-[13px] mt-0.5">{fcfa(totauxEditor.htBrut)}</p></div>
              </div>
              <p className="text-[12px] text-white/65 mt-2.5">Elle majore proportionnellement tous les prix unitaires du devis final (arrondis aux 5 FCFA). Le client ne voit que les prix majorés — la marge n'apparaît ni sur le PDF, ni sur WhatsApp.</p>
            </div>
            <div className="col-span-2 bg-orange-50 border border-orange-200 rounded-2xl p-3.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-extrabold text-[#92400E] flex items-center gap-1.5"><HardHat size={14} /> SIMULATEUR DE MAIN-D'ŒUVRE</span>
                <span className="font-extrabold text-[#B45309]">{fcfa(totauxEditor.mo)}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <button onClick={() => changeMoMode("pct")} className={`py-2.5 rounded-xl font-extrabold text-sm border-2 flex items-center justify-center gap-1.5 ${moMode === "pct" ? "bg-[#F59E0B] text-white border-[#F59E0B]" : "bg-white text-slate-600 border-slate-200"}`}><Percent size={15} /> En % des matériaux</button>
                <button onClick={() => changeMoMode("equipe")} className={`py-2.5 rounded-xl font-extrabold text-sm border-2 flex items-center justify-center gap-1.5 ${moMode === "equipe" ? "bg-[#F59E0B] text-white border-[#F59E0B]" : "bg-white text-slate-600 border-slate-200"}`}><Users size={15} /> Par équipe / jours</button>
              </div>
              {moMode === "pct" ? (
                <>
                  <div className="flex items-center gap-3 mt-3">
                    <input type="range" min={0} max={60} step={1} value={mainOeuvrePct} onChange={(e) => changeMainOeuvrePct(Number(e.target.value))} className="flex-1 accent-[#F59E0B] min-w-0" />
                    <div className="flex items-center border bg-white rounded-xl overflow-hidden shrink-0">
                      <input type="number" min={0} max={100} value={mainOeuvrePct} onChange={(e) => changeMainOeuvrePct(Number(e.target.value))} className="w-14 text-center py-2 font-extrabold outline-none" />
                      <span className="pr-2.5 font-bold text-slate-500 text-sm">%</span>
                    </div>
                  </div>
                  <p className="text-[12px] text-slate-600 mt-2">Base métier CI : <b>{mainOeuvrePct} % du total des matériaux</b> ({fcfa(totauxEditor.materiaux)}). Défaut 30 %.</p>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    <label className="bg-white border rounded-xl px-2.5 py-2"><span className="text-[11px] font-bold text-slate-500 block">MAÇONS</span><input type="number" min={0} value={equipe.macons} onChange={(e) => changeEquipe({ macons: Number(e.target.value) })} className="w-full font-extrabold py-1 outline-none" /></label>
                    <label className="bg-white border rounded-xl px-2.5 py-2"><span className="text-[11px] font-bold text-slate-500 block">MANŒUVRES</span><input type="number" min={0} value={equipe.manoeuvres} onChange={(e) => changeEquipe({ manoeuvres: Number(e.target.value) })} className="w-full font-extrabold py-1 outline-none" /></label>
                    <label className="bg-white border rounded-xl px-2.5 py-2"><span className="text-[11px] font-bold text-slate-500 block">JOURS</span><input type="number" min={0} value={equipe.jours} onChange={(e) => changeEquipe({ jours: Number(e.target.value) })} className="w-full font-extrabold py-1 outline-none" /></label>
                    <label className="bg-white border rounded-xl px-2.5 py-2"><span className="text-[11px] font-bold text-slate-500 block">MAÇON FCFA/J</span><input type="number" min={0} step={500} value={equipe.tauxMacon} onChange={(e) => changeEquipe({ tauxMacon: Number(e.target.value) })} className="w-full font-extrabold py-1 outline-none" /></label>
                    <label className="bg-white border rounded-xl px-2.5 py-2"><span className="text-[11px] font-bold text-slate-500 block">MANŒUVRE FCFA/J</span><input type="number" min={0} step={500} value={equipe.tauxManoeuvre} onChange={(e) => changeEquipe({ tauxManoeuvre: Number(e.target.value) })} className="w-full font-extrabold py-1 outline-none" /></label>
                    <div className="bg-[#0F172A] text-white rounded-xl px-2.5 py-2"><span className="text-[11px] font-bold text-white/60 block">TOTAL ÉQUIPE</span><p className="font-extrabold py-1 text-[14px]">{fcfa(totauxEditor.moBase)}</p></div>
                  </div>
                  <p className="text-[12px] text-slate-600 mt-2">{equipe.macons} maçon(s) × {equipe.jours} j × {fcfa(equipe.tauxMacon)} + {equipe.manoeuvres} manœuvre(s) × {equipe.jours} j × {fcfa(equipe.tauxManoeuvre)}.{totalPlanning > 0 && <> Planning IA : {totalPlanning} jours — pensez à aligner les jours d'équipe.</>}</p>
                </>
              )}
            </div>
            <div className="col-span-2 bg-amber-50 border border-amber-300 rounded-2xl p-3.5">
              <span className="text-xs font-extrabold text-amber-900 flex items-center gap-1.5"><Clock size={14} /> VALIDITÉ DE L'OFFRE</span>
              <div className="flex gap-2 mt-2.5">
                {[7, 15, 30].map((j) => (
                  <button key={j} onClick={() => setValiditeJours(j)} className={`flex-1 py-2.5 rounded-xl font-extrabold text-sm border-2 ${validiteJours === j ? "bg-amber-500 text-white border-amber-500" : "bg-white text-slate-600 border-slate-200"}`}>{j} jours</button>
                ))}
              </div>
              <p className="text-[12px] text-amber-900/75 leading-relaxed mt-2.5">{clauseValidite(validiteJours, d.createdAt).texte}</p>
            </div>
            <label><span className="text-xs font-bold text-slate-500">REMISE CLIENT %</span><input type="number" value={remisePct} onChange={e => setRemisePct(Number(e.target.value))} className="w-full border rounded-xl px-3 py-2.5 mt-1 font-semibold outline-none focus:border-[#F59E0B]" /></label>
            <label><span className="text-xs font-bold text-slate-500">TVA % (CI : 18%)</span><input type="number" value={tvaPct} onChange={e => setTvaPct(Number(e.target.value))} className="w-full border rounded-xl px-3 py-2.5 mt-1 font-semibold outline-none focus:border-[#F59E0B]" /></label>
            <label className="col-span-2"><span className="text-xs font-bold text-slate-500">NOTES / CONDITIONS</span><textarea value={d.notes || ""} onChange={e => setEditor({ ...editor, devis: { ...d, notes: e.target.value } })} rows={2} className="w-full border rounded-xl px-3 py-2.5 mt-1 outline-none focus:border-[#F59E0B]" placeholder="Ex : démarrage sous 7 jours après acompte de 40%…" /></label>
            <div className="col-span-2 text-sm space-y-1.5 bg-[#F1F5F9] rounded-xl p-3.5">
              <div className="flex justify-between"><span>Total matériaux & fournitures</span><b>{fcfa(totauxEditor.materiaux)}</b></div>
              <div className="flex justify-between"><span>Main-d'œuvre et mise en œuvre ({moMode === "equipe" ? `équipe ${equipe.macons + equipe.manoeuvres} ouvriers × ${equipe.jours} j` : `${mainOeuvrePct} %`})</span><b>{fcfa(totauxEditor.mo)}</b></div>
              <div className="flex justify-between border-t border-slate-200 pt-1.5"><span>Total HT</span><b>{fcfa(totauxEditor.htBrut)}</b></div>
              {remisePct > 0 && <div className="flex justify-between text-emerald-700"><span>Remise ({remisePct}%)</span><b>− {fcfa(totauxEditor.remise)}</b></div>}
              <div className="flex justify-between"><span>TVA {tvaPct}%</span><b>{fcfa(totauxEditor.tva)}</b></div>
              <div className="flex justify-between text-base border-t border-slate-300 pt-2"><span className="font-bold">Total TTC</span><b className="text-[#D97706]">{fcfa(totauxEditor.ttc)}</b></div>
            </div>
            <NormesRappel />
          </div>

          {/* Achats quincaillerie, facture d'acompte & avenant */}
          <div className="grid grid-cols-3 gap-2.5">
            <button onClick={() => openAchats(d, editor.lignes)} className="bg-white border-2 border-emerald-600 text-emerald-800 font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 text-sm shadow-sm">
              <ShoppingCart size={17} /> Liste d'achats
            </button>
            <button onClick={() => openAcompte(d)} className="bg-white border-2 border-[#F59E0B] text-[#B45309] font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 text-sm shadow-sm">
              <Receipt size={17} /> Acompte
            </button>
            <button onClick={() => openAvenant(d)} className="bg-white border-2 border-violet-500 text-violet-800 font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 text-sm shadow-sm">
              <FilePlus2 size={17} /> Créer un Avenant
            </button>
          </div>
          <p className="text-center text-[11px] text-slate-400 -mt-1">Achats : quantités nettes pour la quincaillerie • Acompte : 30 %, 40 % ou % personnalisé • Avenant : travaux supplémentaires liés à ce devis{avenants.length ? ` (${avenants.length} existant${avenants.length > 1 ? "s" : ""})` : ""}.</p>

          {/* Signature électronique client */}
          <section className={`rounded-2xl p-4 shadow-sm border-2 ${d.signedAt ? "bg-emerald-50 border-emerald-300" : "bg-white border-emerald-600/50"}`}>
            <h3 className="font-extrabold text-sm flex items-center gap-2"><PenLine size={16} className="text-[#009A44]" /> Signature électronique du client</h3>
            {d.signedAt ? (
              <div className="mt-2.5 flex flex-wrap items-center gap-3">
                <span className="bg-emerald-600 text-white text-xs font-extrabold px-3 py-1.5 rounded-full flex items-center gap-1"><CheckCircle2 size={13} /> Chantier validé</span>
                <p className="text-[13px] text-emerald-900">Signé par <b>{d.signatureClientNom}</b> le {new Date(d.signedAt).toLocaleString("fr-FR")}.</p>
                {d.signatureClientData && <img src={d.signatureClientData} alt="Signature client" className="h-12 bg-white border rounded-lg px-2 py-1" />}
              </div>
            ) : (
              <>
                <p className="text-[13px] text-slate-500 mt-1.5">Envoyez au client un lien public : il consulte le devis, le planning et les conditions, puis <b>signe avec son doigt</b> sur son smartphone. Vous serez notifié ici dès la signature.</p>
                {shareUrl ? (
                  <div className="mt-3 space-y-2">
                    <div className="flex gap-2">
                      <input readOnly value={shareUrl} onClick={(e) => (e.target as HTMLInputElement).select()} className="flex-1 min-w-0 bg-[#F1F5F9] border rounded-xl px-3 py-2.5 text-[13px] font-medium outline-none" />
                      <button onClick={async () => { try { await navigator.clipboard.writeText(shareUrl); showToast("Lien de signature copié."); } catch { showToast(shareUrl); } }} className="bg-slate-900 text-white font-bold text-sm px-3.5 rounded-xl flex items-center gap-1.5 shrink-0"><Copy size={15} /> Copier</button>
                    </div>
                    <button onClick={() => { const montant = materiauxClient ? totauxEditor.moSeuleTTC : totauxEditor.ttc; const msg = `Bonjour ${d.clientNom}, voici votre devis ${d.numero} (${fcfa(montant)} TTC${materiauxClient ? ", main-d'œuvre seule" : ""}, valable ${validiteJours} jours). Consultez-le et signez directement sur votre téléphone pour valider le chantier : ${shareUrl}`; demanderDestinataire({ titre: "Envoyer le lien de signature", texte: msg, tel: d.clientTel || "", nom: d.clientNom }); }} className="w-full bg-[#25D366] text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 text-sm"><Send size={16} /> Envoyer le lien de signature sur WhatsApp</button>
                  </div>
                ) : (
                  <button onClick={genererLienSignature} className="mt-3 w-full bg-[#009A44] text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 text-sm"><Link2 size={16} /> Générer le lien de signature client</button>
                )}
              </>
            )}
          </section>

          {/* Planning estimatif IA éditable */}
          <section className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-extrabold text-sm flex items-center gap-2"><CalendarDays size={16} className="text-[#D97706]" /> Planning estimatif IA</h3>
              <span className="text-xs font-bold bg-orange-50 text-[#B45309] border border-orange-200 rounded-full px-2.5 py-1 flex items-center gap-1"><Timer size={12} /> {totalPlanning} j ouvrés (~{Math.ceil(totalPlanning / 5)} sem.)</span>
            </div>
            <div className="mt-3 space-y-2">
              {planning.map((e, i) => (
                <div key={i} className="flex items-center gap-2 bg-[#F1F5F9] rounded-xl px-3 py-2">
                  <span className="bg-[#0F172A] text-white w-6 h-6 rounded-full grid place-items-center text-[11px] font-bold shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <input value={e.etape} onChange={(ev) => { const np = [...planning]; np[i] = { ...e, etape: ev.target.value }; setPlanning(np); }} className="w-full bg-transparent font-bold text-[13px] outline-none" />
                    <input value={e.detail || ""} onChange={(ev) => { const np = [...planning]; np[i] = { ...e, detail: ev.target.value }; setPlanning(np); }} className="w-full bg-transparent text-[11px] text-slate-500 outline-none" placeholder="Détail de l'étape" />
                  </div>
                  <div className="flex items-center bg-white border rounded-lg overflow-hidden shrink-0">
                    <input type="number" min={0} value={e.dureeJours} onChange={(ev) => { const np = [...planning]; np[i] = { ...e, dureeJours: Number(ev.target.value) }; setPlanning(np); }} className="w-12 text-center py-1.5 font-extrabold outline-none text-sm" />
                    <span className="pr-2 text-[11px] font-bold text-slate-400">jours</span>
                  </div>
                  <button onClick={() => setPlanning(planning.filter((_, j) => j !== i))} className="text-red-500 bg-red-50 p-1.5 rounded-lg shrink-0"><Trash2 size={13} /></button>
                </div>
              ))}
              {planning.length === 0 && <p className="text-sm text-slate-400 text-center py-2">Aucune étape — ajoutez-en une ou régénérez le devis.</p>}
            </div>
            <button onClick={() => setPlanning([...planning, { etape: "Nouvelle étape", dureeJours: 3, detail: "" }])} className="mt-2.5 text-sm font-bold text-[#B45309] flex items-center gap-1"><Plus size={15} /> Ajouter une étape</button>
            <p className="text-[11px] text-slate-400 mt-2">Le planning est affiché dans le PDF du devis et sur la page de signature du client. Pensez à cliquer « Enregistrer ».</p>
          </section>

          {factures.length > 0 && (
            <section className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
              <h3 className="font-extrabold text-sm flex items-center gap-2"><Receipt size={16} className="text-[#F59E0B]" /> Factures d'acompte de ce devis</h3>
              <div className="space-y-2 mt-3">
                {factures.map((f) => (
                  <div key={f.id} className="flex flex-wrap items-center gap-2 bg-[#F1F5F9] rounded-xl px-3 py-2.5">
                    <div className="flex-1 min-w-[150px]">
                      <p className="font-bold text-[13px]">{f.numero} — {f.pct} %</p>
                      <p className="text-[11px] text-slate-500">{fcfa(f.montant)} • Solde restant : {fcfa(f.soldeRestant)} • {dateFr(f.createdAt)}</p>
                    </div>
                    <select value={f.statut} onChange={(e) => setStatutFacture(f, e.target.value)} className="bg-white border rounded-lg text-xs font-bold px-2 py-1.5">
                      <option value="emise">Émise</option><option value="payee">Payée</option><option value="annulee">Annulée</option>
                    </select>
                    <button onClick={() => downloadFacturePDF(f, d)} className="bg-[#F59E0B] text-white text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1"><Download size={13} /> PDF</button>
                    <button onClick={() => demanderDestinataire({ titre: `Envoyer la facture ${f.numero}`, texte: factureWhatsAppText(f, d), tel: d.clientTel || "", nom: d.clientNom })} className="bg-[#25D366] text-white text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1"><MessageCircle size={13} /> WhatsApp</button>
                  </div>
                ))}
              </div>
              <p className="text-[12px] text-slate-500 mt-2.5">Déjà facturé : <b>{fcfa(dejaFactureTotal)}</b> sur {fcfa(d.totalTTC || totauxEditor.ttc)} — solde global restant : <b>{fcfa((d.totalTTC || totauxEditor.ttc) - dejaFactureTotal)}</b>.</p>
            </section>
          )}

          <button onClick={() => deleteDevis(d.id)} className="w-full text-red-600 font-semibold text-sm py-2 flex items-center justify-center gap-2"><Trash2 size={15} /> Supprimer ce devis</button>
          </>)}
        </main>

        {/* Barre d'actions fixe */}
        <div className="fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t shadow-[0_-8px_30px_rgba(0,0,0,.08)] px-3 pt-2.5 pb-[max(env(safe-area-inset-bottom),10px)]">
          <div className="max-w-5xl mx-auto">
            <div className="flex justify-between items-center px-1 pb-1.5"><span className="text-xs font-bold text-slate-500">{editor.lignes.length} lignes • {materiauxClient ? "À payer (main-d'œuvre)" : "Total TTC"}</span><span className="font-extrabold text-lg text-[#0F172A] tnum">{fcfa(materiauxClient ? totauxEditor.moSeuleTTC : totauxEditor.ttc)}</span></div>
            {/* Destinataire WhatsApp intégré */}
            <div className="flex items-center gap-2 px-1 pb-2">
              <span className="text-[11px] font-extrabold text-slate-400 shrink-0">ENVOYER À</span>
              <button onClick={() => shareWhatsApp()}
                className="flex-1 min-w-0 flex items-center gap-1.5 bg-slate-100 border border-slate-200 rounded-xl px-2.5 py-2 text-left">
                <Phone size={13} className="text-[#25D366] shrink-0" />
                <span className={`flex-1 min-w-0 truncate text-[12px] font-bold ${d.clientTel ? "text-slate-700 tnum" : "text-slate-400"}`}>{d.clientTel || "Choisir le numéro du destinataire"}</span>
                <ChevronRight size={14} className="text-slate-400 shrink-0" />
              </button>
              <button onClick={() => {
                const t = prompt("Numéro WhatsApp du client (10 chiffres, ex : 07 07 12 34 56)", d.clientTel || "");
                if (t === null) return;
                const numero = normaliserNumeroWhatsApp(t);
                if (!numero.valide) { showToast(numero.erreur); return; }
                setEditor({ ...editor, devis: { ...d, clientTel: t.trim() } });
                showToast("Numéro modifié. Cliquez sur Enregistrer pour le conserver sur le devis.");
              }} className="bg-[#25D366]/10 border border-[#25D366]/40 text-[#128C4B] font-bold px-2.5 py-2 rounded-xl shrink-0" title="Modifier le numéro du devis" aria-label="Modifier le numéro"><UserPlus size={15} /></button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => saveEditor()} disabled={saving} className="bg-slate-900 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-1.5 text-sm disabled:opacity-50"><Save size={16} /> {saving ? "…" : "Enregistrer"}</button>
              <button onClick={() => downloadPDF()} className="bg-[#F59E0B] text-white font-bold py-3 rounded-xl flex items-center justify-center gap-1.5 text-sm shadow-lg shadow-amber-200"><Download size={16} /> PDF {formatPapier}</button>
              <button onClick={() => downloadPDF(undefined, undefined, undefined, "apercu")} className="bg-white border-2 border-slate-300 text-slate-700 font-bold py-3 rounded-xl flex items-center justify-center gap-1.5 text-sm"><Printer size={16} /> Imprimer</button>
              <button onClick={partagerDevisEnregistre} disabled={saving} className="bg-[#25D366] text-white font-bold py-3 rounded-xl flex items-center justify-center gap-1.5 text-sm shadow-lg shadow-emerald-200 disabled:opacity-60"><MessageCircle size={16} /> WhatsApp</button>
            </div>
          </div>
        </div>
        {renderProModals()}
        {renderPdfApercu()}
        {renderWhatsAppDestinataire()}
        {toast && <Toast msg={toast} />}
      </div>
    );
  }

  // ---------- APP PRINCIPALE ----------
  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-32 md:pb-12 text-[#0F172A]">
      {/* Header moderne blanc */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-slate-200/80 shadow-[0_8px_30px_-18px_rgb(15_23_42/.25)]">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <img src="/icons/icon-192.png" alt="DevisBTP CI" className="w-10 h-10 rounded-2xl shadow-md shadow-amber-200 ring-1 ring-slate-200" />
          <div className="flex-1 min-w-0">
            <h1 className="font-extrabold leading-none text-[17px] tracking-tight">DevisBTP <span className="text-[#D97706]">CI</span></h1>
            <p className="text-[11px] text-slate-500 truncate mt-0.5">Devis chantier par IA • Côte d'Ivoire</p>
          </div>
          {!isOnline && <span className="text-[11px] bg-red-50 text-red-600 border border-red-200 rounded-full px-2 py-1 flex items-center gap-1 font-bold"><WifiOff size={11} /> Hors ligne</span>}
          <button onClick={() => setTab("prix")} className="bg-[#F59E0B] hover:bg-[#D97706] active:scale-95 transition text-white font-extrabold rounded-full px-3.5 py-2.5 flex items-center gap-1.5 text-sm shadow-lg shadow-amber-200 shrink-0 tnum"><Coins size={16} /> {creditsLabel}</button>
          <button onClick={seDeconnecter} aria-label="Se déconnecter" title={`Connecté : ${compte?.email || ""} — se déconnecter`} className="w-10 h-10 grid place-items-center rounded-full bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600 transition shrink-0"><LogOut size={17} /></button>
        </div>
        <nav className="hidden md:flex max-w-6xl mx-auto px-4 pb-3 gap-2 items-center">
          {([["accueil", Home, "Accueil"], ["devis", FileText, "Mes Devis"], ["prix", Tag, "Mes Prix"], ["entreprise", Building2, "Entreprise"]] as const).map(([k, Icon, label]) => (
            <button key={k} onClick={() => (k === "entreprise" ? goEntreprise() : setTab(k))} className={`px-4 py-2.5 rounded-full font-bold text-sm flex items-center gap-2 transition ${tab === k ? "bg-[#0F172A] text-white shadow-lg" : "text-slate-600 hover:bg-slate-100"}`}><Icon size={15} />{label}</button>
          ))}
          <button onClick={goNouveau} className="ml-auto bg-[#F59E0B] hover:bg-[#D97706] text-white px-5 py-2.5 rounded-full font-extrabold text-sm flex items-center gap-2 shadow-lg shadow-amber-200 active:scale-95 transition"><Plus size={17} /> Nouveau Devis</button>
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-3 sm:px-5 py-4 sm:py-6">
        {installPrompt && (
          <div className="mb-4 bg-white border border-orange-200 rounded-2xl p-3.5 flex items-center gap-3 shadow-sm animate-fadeUp">
            <Smartphone className="text-[#F59E0B] shrink-0" /><div className="flex-1 min-w-0"><p className="font-bold text-sm">Installez DevisBTP CI</p><p className="text-xs text-slate-500">Accès chantier en 1 toucher, même avec une connexion faible.</p></div>
            <button onClick={async () => { await installPrompt.prompt(); setInstallPrompt(null); }} className="bg-[#0F172A] text-white text-xs font-bold px-3.5 py-2.5 rounded-xl shrink-0">Installer</button>
            <button onClick={() => setInstallPrompt(null)} className="text-slate-400 shrink-0"><X size={16} /></button>
          </div>
        )}

        {serveurInjoignable && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-2xl p-3.5 flex items-center gap-3">
            <WifiOff className="text-red-600 shrink-0" size={18} />
            <div className="flex-1 min-w-0"><p className="font-bold text-sm text-red-900">Serveur momentanément injoignable</p><p className="text-xs text-red-700/80">Vos données sont conservées. Vérifiez votre connexion puis réessayez.</p></div>
            <button onClick={() => { setServeurInjoignable(false); loadDashboard(); }} className="bg-red-600 text-white text-xs font-extrabold px-3.5 py-2.5 rounded-xl shrink-0">Réessayer</button>
          </div>
        )}

        {tab === "accueil" && (
          <div className="space-y-4 animate-fadeUp">
            {/* Hero crédits */}
            <section className="relative overflow-hidden rounded-3xl text-white shadow-xl">
              <img src={HERO} alt="Chantier en Côte d'Ivoire" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-br from-[#0F172A]/95 via-[#0F172A]/85 to-[#D97706]/55" />
              <div className="relative p-5 sm:p-6">
                <p className="text-amber-200 text-sm font-semibold">Bonjour, {entreprise?.proprietaire}</p>
                <h2 className="font-extrabold text-[22px] leading-tight mt-1">{entreprise?.nom}</h2>
                <p className="text-white/75 text-[13px] mt-1 flex items-center gap-1"><MapPin size={12} /> {entreprise?.ville} • {entreprise?.telephone}</p>
                <p className="text-white/55 text-[12px] mt-1 flex items-center gap-1 truncate"><Mail size={12} /> {compte?.email}</p>
                <div className="mt-5 bg-white/10 backdrop-blur border border-white/15 rounded-2xl p-4 flex items-center gap-4">
                  <div className="bg-[#F59E0B] w-14 h-14 rounded-2xl grid place-items-center shrink-0 shadow-lg"><Coins size={28} /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white/70 text-xs font-semibold uppercase tracking-wide">Crédits devis restants</p>
                    <p className="font-extrabold text-3xl leading-none mt-1">{credits === Infinity ? "Illimité" : credits} <span className="text-sm font-bold text-white/70">{credits === Infinity ? "offre active" : credits > 1 ? "crédits" : "crédit"}</span></p>
                    <p className="text-[12px] text-emerald-200 mt-1.5">{entreprise?.plan === "gratuit" ? "1 devis gratuit offert à l'inscription" : `Offre ${entreprise?.plan} active • ${entreprise?.totalDevisGeneres || 0} devis générés au total`}</p>
                  </div>
                </div>
                {credits !== Infinity && (
                  <div className="mt-3"><div className="h-2 bg-white/20 rounded-full overflow-hidden"><div className="h-full bg-[#F59E0B] rounded-full transition-all" style={{ width: `${Math.min(100, (Number(credits) / 5) * 100)}%` }} /></div>
                    <p className="text-[11px] text-white/60 mt-1.5">{credits === 0 ? "Crédits épuisés — rechargez pour continuer à chiffrer." : "Astuce : le Pack Pro à 9 900 FCFA vous donne 5 devis / mois."}</p></div>
                )}
                <div className="grid grid-cols-2 gap-2.5 mt-4">
                  <button onClick={goNouveau} className="bg-[#F59E0B] hover:bg-[#D97706] font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-xl text-[15px]"><Sparkles size={18} /> Nouveau devis IA</button>
                  <button onClick={() => setTab("prix")} className="bg-white text-[#0F172A] font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 text-[15px]"><Wallet size={18} /> Recharger</button>
                </div>
              </div>
            </section>

            {/* Stats */}
            <section className="grid grid-cols-3 gap-2.5">
              {[
                { icon: FileText, label: "Devis créés", value: stats?.nbDevis ?? devisList.length, sub: "au total" },
                { icon: TrendingUp, label: "Montant devisé", value: fcfa(stats?.totalMontant || 0).replace(" FCFA", ""), sub: "FCFA (TTC)" },
                { icon: BadgeCheck, label: "Validés", value: stats?.signes ?? 0, sub: `${stats?.envoyes ?? 0} envoyés` },
              ].map((s, i) => (
                <div key={i} className="bg-white rounded-2xl p-3.5 shadow-sm border border-slate-100 text-center sm:text-left">
                  <s.icon size={18} className="text-[#009A44] mx-auto sm:mx-0" /><p className="font-extrabold text-[17px] sm:text-xl mt-1.5 leading-none break-words">{s.value}</p><p className="text-[11px] font-bold text-slate-500 mt-1">{s.label}</p><p className="text-[11px] text-slate-400">{s.sub}</p>
                </div>
              ))}
            </section>

            <button onClick={goEntreprise} className="w-full bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3 text-left shadow-sm">
              {entreprise?.logoData ? <img src={entreprise.logoData} alt="" className="w-11 h-11 object-contain bg-[#F1F5F9] rounded-xl shrink-0" /> : <span className="bg-[#0F172A] text-white w-11 h-11 rounded-xl grid place-items-center shrink-0"><Building2 size={20} /></span>}
              <span className="flex-1 min-w-0">
                <b className="block text-sm">Mon Entreprise — logo, cachet & mentions légales</b>
                <span className="block text-xs text-slate-500 truncate">
                  {entreprise?.rccm ? `RCCM : ${entreprise.rccm}` : "RCCM à compléter"} • {entreprise?.compteContribuable ? `CC : ${entreprise.compteContribuable}` : "Compte Contribuable à compléter"} • {entreprise?.cachetData ? "Cachet prêt" : "Cachet manquant"} • {entreprise?.signatureData ? "Signature prête" : "Signature manquante"}
                </span>
              </span>
              <span className="bg-[#F59E0B] text-white text-xs font-bold px-3 py-2 rounded-xl shrink-0">Compléter</span>
            </button>

            {credits === 0 && (
              <button onClick={() => setTab("prix")} className="w-full bg-amber-50 border border-amber-300 text-amber-900 rounded-2xl p-4 flex items-center gap-3 text-left">
                <Zap className="text-[#F59E0B] shrink-0" /><span className="flex-1 text-sm"><b>Plus de crédits.</b> Rechargez en 30 secondes par Wave ou Orange Money et générez votre prochain devis.</span><ChevronRight className="shrink-0" />
              </button>
            )}

            {/* Comment ça marche */}
            <section className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
              <h3 className="font-extrabold text-[16px]">Un devis pro en moins de 2 minutes</h3>
              <div className="grid sm:grid-cols-3 gap-3 mt-4">
                {[
                  { n: "1", icon: Camera, t: "Décrivez + photo du plan", d: "Client, lieu du chantier, travaux. Prenez le plan en photo si vous l'avez." },
                  { n: "2", icon: Sparkles, t: "L'IA chiffre le DQE", d: "Quantités calculées et prix moyens CI : ciment 50 kg, fer à béton, agglos, sable, gravier…" },
                  { n: "3", icon: MessageCircle, t: "Ajustez, PDF, WhatsApp", d: "Modifiez prix et quantités, exportez un PDF propre et partagez en 1 clic." },
                ].map(s => (
                  <div key={s.n} className="bg-[#F1F5F9] rounded-2xl p-4"><div className="flex items-center gap-2"><span className="bg-[#0F172A] text-white w-6 h-6 rounded-full grid place-items-center text-xs font-bold">{s.n}</span><s.icon size={17} className="text-[#F59E0B]" /></div><p className="font-bold text-sm mt-2.5">{s.t}</p><p className="text-[13px] text-slate-600 mt-1 leading-snug">{s.d}</p></div>
                ))}
              </div>
            </section>

            {/* Derniers devis */}
            <section>
              <div className="flex items-center justify-between px-1 mb-2.5"><h3 className="font-extrabold text-[16px]">Mes derniers devis</h3><button onClick={() => setTab("devis")} className="text-[#D97706] font-bold text-sm flex items-center">Tout voir <ChevronRight size={16} /></button></div>
              {devisList.length === 0 ? (
                <div className="bg-white rounded-3xl p-8 text-center border border-dashed border-slate-300"><HardHat className="mx-auto text-slate-300" size={36} /><p className="font-bold mt-3">Aucun devis pour le moment</p><p className="text-sm text-slate-500 mt-1">Votre devis gratuit vous attend.</p><button onClick={goNouveau} className="mt-4 bg-[#F59E0B] text-white font-bold px-5 py-3 rounded-xl">Créer mon 1er devis gratuit</button></div>
              ) : <div className="space-y-2.5">{devisList.slice(0, 4).map(d => <DevisCard key={d.id} d={d} onOpen={() => openDevis(d.id)} onPdf={async () => { try { const r = await fetchAvecRecuperation(`/api/devis/${d.id}`); const j = await r.json(); if (!r.ok || !j.devis) { showToast(j.error || "Devis introuvable pour l'export PDF."); return; } await downloadPDF(j.devis, j.lignes || [], j.planning || []); } catch { showToast("Export PDF impossible : vérifiez votre connexion."); } }} onWa={() => partagerDevisParId(d.id)} onAchats={() => openAchats(d)} onAcompte={() => openAcompte(d)} onAvenant={() => openAvenant(d)} />)}</div>}
            </section>

            {/* Catalogue prix */}
            <section className="bg-[#0F172A] text-white rounded-3xl p-5 shadow-xl overflow-hidden relative">
              <img src={IMG2} alt="" className="absolute right-0 top-0 w-40 h-full object-cover opacity-20 hidden sm:block" />
              <div className="relative">
                <h3 className="font-extrabold text-[16px] flex items-center gap-2"><Calculator className="text-[#F59E0B]" /> Normes CI & prix par défaut</h3>
                <p className="text-white/65 text-[13px] mt-1">Base de connaissances métier intégrée au moteur IA — prix modifiables dans chaque devis.</p>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {["13 agglos/m²", "Béton 350 : 7 sacs/m³", "Acier 90 / 50 kg/m³", "Carrelage +10 %", "MO 30 % matériaux"].map((chip) => (
                    <span key={chip} className="bg-emerald-400/15 border border-emerald-300/25 text-emerald-200 text-[11px] font-bold px-2.5 py-1 rounded-full">{chip}</span>
                  ))}
                </div>
                <div className="mt-4 space-y-2">
                  {CATALOGUE_CI.slice(0, 7).map((c, i) => (
                    <div key={i} className="flex justify-between gap-3 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-[13px]"><span className="min-w-0"><b className="block truncate">{c.designation}</b><span className="text-white/50 text-[11px]">{c.fourchette}</span></span><b className="text-[#FCD34D] whitespace-nowrap">{fcfa(c.prix)}<span className="text-white/50 font-normal"> /{c.unite}</span></b></div>
                  ))}
                </div>
                <button onClick={() => setShowCatalogue(!showCatalogue)} className="mt-4 bg-white text-[#0F172A] font-bold text-sm px-4 py-2.5 rounded-xl">{showCatalogue ? "Masquer le catalogue" : `Voir les ${CATALOGUE_CI.length} prix du catalogue`}</button>
                {showCatalogue && <div className="mt-4 grid sm:grid-cols-2 gap-2 animate-fadeUp">{CATALOGUE_CI.map((c, i) => <div key={i} className="bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-[13px]"><p className="text-[10px] font-bold text-emerald-300 uppercase tracking-wide">{c.categorie}</p><div className="flex justify-between gap-2 mt-0.5"><span className="min-w-0">{c.designation}</span><b className="text-[#FCD34D] whitespace-nowrap">{fcfa(c.prix)}</b></div></div>)}</div>}
              </div>
            </section>

            <section className="grid grid-cols-3 gap-2.5 text-center">
              {[{ icon: ShieldCheck, t: "Prix CI vérifiés" }, { icon: FileCheck, t: "PDF professionnel" }, { icon: Smartphone, t: "Wave & OM acceptés" }].map((b, i) => (
                <div key={i} className="bg-white rounded-2xl py-4 px-2 border border-slate-100 shadow-sm"><b.icon className="mx-auto text-[#009A44]" size={20} /><p className="text-[11px] font-bold mt-1.5 leading-tight">{b.t}</p></div>
              ))}
            </section>
          </div>
        )}

        {tab === "nouveau" && (
          <div className="space-y-4 animate-fadeUp max-w-2xl mx-auto pb-6">
            <div>
              <h2 className="font-extrabold text-[22px] tracking-tight">Nouveau devis par IA</h2>
              <p className="text-sm text-slate-500 mt-0.5">Coût : <b className="text-[#D97706]">1 crédit</b> — il vous en reste <b>{creditsLabel}</b>. {entreprise?.plan === "gratuit" && "Votre 1er devis est offert."}</p>
            </div>

            {/* Tunnel progressif en 3 étapes */}
            <div className="card rounded-3xl p-4 sticky top-[76px] z-20">
              <div className="flex items-center gap-2">
                {[
                  { n: 1, label: "Client & Chantier" },
                  { n: 2, label: "Travaux ou Photo" },
                  { n: 3, label: "Vérification & Export" },
                ].map((st, i) => (
                  <div key={st.n} className="flex items-center gap-2 flex-1 last:flex-none min-w-0">
                    <button onClick={() => { if (st.n < createStep) setCreateStep(st.n); }} className="flex items-center gap-2 min-w-0">
                      <span className={`w-8 h-8 rounded-full grid place-items-center text-[13px] font-extrabold shrink-0 transition-all ${createStep > st.n ? "bg-emerald-500 text-white" : createStep === st.n ? "bg-[#F59E0B] text-white shadow-lg shadow-amber-200 scale-105" : "bg-slate-100 text-slate-400"}`}>
                        {createStep > st.n ? <Check size={15} /> : st.n}
                      </span>
                      <span className={`text-[11px] font-extrabold leading-tight text-left hidden min-[420px]:block ${createStep === st.n ? "text-[#0F172A]" : "text-slate-400"}`}>{st.label}</span>
                    </button>
                    {i < 2 && <span className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden min-w-4"><span className={`block h-full rounded-full transition-all duration-500 ${createStep > st.n ? "w-full bg-emerald-500" : "w-0"}`} /></span>}
                  </div>
                ))}
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full mt-3 overflow-hidden"><div className="h-full bg-[#F59E0B] rounded-full transition-all duration-500" style={{ width: `${(createStep / 3) * 100}%` }} /></div>
              <p className="text-[12px] font-bold text-slate-500 mt-2">Étape {createStep} sur 3 — {createStep === 1 ? "Qui est le client et où se situe le chantier ?" : createStep === 2 ? "Décrivez les travaux ou photographiez le plan." : "Vérifiez tout, réglez vos prix, puis générez l'aperçu/export."}</p>
            </div>

            <div className="card rounded-[1.75rem] p-5 space-y-4">
              {createStep === 1 && (<>
              <label className="block"><span className="text-xs font-bold text-slate-600 flex items-center gap-1.5"><User size={13} /> NOM DU CLIENT *</span>
                <input value={form.clientNom} onChange={e => setForm({ ...form, clientNom: e.target.value })} placeholder="Ex : Mme Aya Koné" className="w-full border-2 border-slate-200 rounded-2xl px-4 py-3.5 mt-1.5 font-medium outline-none focus:border-[#F59E0B]" /></label>
              <label className="block"><span className="text-xs font-bold text-slate-600 flex items-center gap-1.5"><Phone size={13} /> TÉLÉPHONE WHATSAPP DU CLIENT</span>
                <input value={form.clientTel} onChange={e => setForm({ ...form, clientTel: e.target.value })} placeholder="Ex : 05 44 22 18 90" inputMode="tel" className="w-full border-2 border-slate-200 rounded-2xl px-4 py-3.5 mt-1.5 font-medium outline-none focus:border-[#F59E0B]" /></label>
              <label className="block"><span className="text-xs font-bold text-slate-600 flex items-center gap-1.5"><MapPin size={13} /> LIEU DU CHANTIER *</span>
                <select value={form.lieu} onChange={e => setForm({ ...form, lieu: e.target.value })} className="w-full border-2 border-slate-200 rounded-2xl px-4 py-3.5 mt-1.5 font-medium bg-white outline-none focus:border-[#F59E0B]">{LIEUX.map(l => <option key={l}>{l}</option>)}</select></label>

              </>)}
              {createStep === 2 && (<>
              <div><span className="text-xs font-bold text-slate-600 flex items-center gap-1.5"><Hammer size={13} /> NATURE DES TRAVAUX *</span>
                <div className="flex gap-2 overflow-x-auto no-scrollbar mt-2 pb-1">{TEMPLATES.map(t => <button key={t.label} onClick={() => setForm({ ...form, natureTravaux: t.text })} className="shrink-0 bg-orange-50 border border-orange-200 text-orange-800 text-xs font-bold px-3 py-2 rounded-full">{t.label}</button>)}</div>
                <textarea value={form.natureTravaux} onChange={e => setForm({ ...form, natureTravaux: e.target.value })} rows={4} placeholder="Décrivez les travaux : type de bâtiment, pièces, finitions souhaitées…" className="w-full border-2 border-slate-200 rounded-2xl px-4 py-3.5 mt-1 font-medium outline-none focus:border-[#F59E0B] leading-snug" /></div>

              </>)}
              {createStep === 1 && (<>
              <div className="grid grid-cols-3 gap-2.5">
                <div className="bg-[#F1F5F9] rounded-2xl p-3"><label className="text-[11px] font-bold text-slate-500 flex items-center gap-1"><Ruler size={11} /> SURFACE AU SOL</label>
                  <div className="flex items-center gap-1 mt-1"><input type="number" value={form.surface} onChange={e => setForm({ ...form, surface: Number(e.target.value) })} className="w-full bg-white border rounded-lg px-2 py-2 font-bold outline-none min-w-0" /><span className="text-xs font-bold text-slate-500">m²</span></div>
                  <input type="range" min={30} max={500} step={10} value={form.surface} onChange={e => setForm({ ...form, surface: Number(e.target.value) })} className="w-full accent-[#F59E0B] mt-2" /></div>
                <Stepper label="PIÈCES" value={form.nbPieces} onChange={v => setForm({ ...form, nbPieces: v })} min={1} max={20} />
                <Stepper label="ÉTGES / NIVEAUX" value={form.nbEtages} onChange={v => setForm({ ...form, nbEtages: v })} min={1} max={5} />
              </div>

              </>)}
              {/* Paramètres métier CI — Étape 3 */}
              {createStep === 3 && (<>
              <div className="border-2 border-emerald-100 bg-emerald-50/50 rounded-2xl overflow-hidden">
                <button type="button" onClick={() => setShowNormes(!showNormes)} className="w-full flex items-center gap-2.5 px-4 py-3.5 text-left">
                  <span className="bg-[#009A44] text-white p-2 rounded-xl shrink-0"><Calculator size={16} /></span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-bold text-sm">Normes CI, prix par défaut & main-d'œuvre</span>
                    <span className="block text-xs text-slate-500 truncate">13 agglos/m² • Béton 350 kg/m³ • MO {moCreatePct} % des matériaux • Ciment {fcfa(prixPerso.cimentSac50)}/sac</span>
                  </span>
                  <ChevronRight size={17} className={`text-slate-400 shrink-0 transition-transform ${showNormes ? "rotate-90" : ""}`} />
                </button>
                {showNormes && (
                  <div className="px-4 pb-4 animate-fadeUp">
                    <ul className="space-y-1 bg-white border border-emerald-100 rounded-xl p-3">
                      {NORMES_RESUME.map((n) => <li key={n} className="text-[12px] text-slate-600 flex gap-1.5"><Check size={13} className="text-[#009A44] shrink-0 mt-0.5" />{n}</li>)}
                    </ul>
                    <p className="text-xs font-extrabold text-slate-500 mt-4 mb-2">PRIX PAR DÉFAUT (FCFA) — MODIFIEZ SELON VOTRE FOURNISSEUR</p>
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        ["cimentSac50", "Ciment sac 50 kg", "sac"],
                        ["agglo15Creux", "Agglo 15 creux", "u"],
                        ["ferHA10Barre12m", "Fer HA10 barre 12 m", "barre"],
                        ["ferHA12Barre12m", "Fer HA12 barre 12 m", "barre"],
                        ["ferHA6Barre12m", "Fer HA6 barre 12 m", "barre"],
                        ["sableM3", "Sable", "m³"],
                        ["gravierM3", "Gravier", "m³"],
                        ["colleCarrelageSac25", "Colle carrelage 25 kg", "sac"],
                      ] as const).map(([key, label, unite]) => (
                        <label key={key} className="bg-white border rounded-xl px-3 py-2">
                          <span className="text-[11px] font-bold text-slate-500 block leading-tight">{label} <span className="text-slate-400">/ {unite}</span></span>
                          <input type="number" min={0} value={prixPerso[key]} onChange={(e) => setPrixPerso({ ...prixPerso, [key]: Number(e.target.value) })} className="w-full font-extrabold py-1 outline-none text-[15px]" />
                        </label>
                      ))}
                    </div>
                    <button type="button" onClick={() => setPrixPerso({ ...PRIX_DEFAUT })} className="text-xs font-bold text-[#009A44] mt-2">Réinitialiser les prix par défaut CI</button>
                    <div className="bg-white border border-orange-200 rounded-xl p-3 mt-3">
                      <span className="text-xs font-extrabold text-[#92400E] flex items-center gap-1.5"><HardHat size={14} /> SIMULATEUR DE MAIN-D'ŒUVRE</span>
                      <div className="grid grid-cols-2 gap-2 mt-2.5">
                        <button type="button" onClick={() => setMoCreateMode("pct")} className={`py-2 rounded-lg font-extrabold text-[13px] border-2 ${moCreateMode === "pct" ? "bg-[#F59E0B] text-white border-[#F59E0B]" : "bg-white text-slate-500 border-slate-200"}`}>En % (défaut 30 %)</button>
                        <button type="button" onClick={() => setMoCreateMode("equipe")} className={`py-2 rounded-lg font-extrabold text-[13px] border-2 ${moCreateMode === "equipe" ? "bg-[#F59E0B] text-white border-[#F59E0B]" : "bg-white text-slate-500 border-slate-200"}`}>Par équipe / jours</button>
                      </div>
                      {moCreateMode === "pct" ? (
                        <>
                          <div className="flex items-center gap-3 mt-3">
                            <input type="range" min={0} max={60} step={1} value={moCreatePct} onChange={(e) => setMoCreatePct(Number(e.target.value))} className="flex-1 accent-[#F59E0B] min-w-0" />
                            <div className="flex items-center border rounded-lg overflow-hidden shrink-0"><input type="number" min={0} max={100} value={moCreatePct} onChange={(e) => setMoCreatePct(Math.min(100, Math.max(0, Number(e.target.value))))} className="w-12 text-center py-1.5 font-extrabold outline-none" /><span className="pr-2 font-bold text-slate-500 text-sm">%</span></div>
                          </div>
                          <p className="text-[12px] text-slate-500 mt-1">Pourcentage du total des matériaux (défaut 30 %). Ajustable après génération.</p>
                        </>
                      ) : (
                        <>
                          <div className="grid grid-cols-3 gap-2 mt-3">
                            <label className="border rounded-lg px-2 py-1.5"><span className="text-[10px] font-bold text-slate-400 block">MAÇONS</span><input type="number" min={0} value={equipeCreate.macons} onChange={(e) => setEquipeCreate({ ...equipeCreate, macons: Number(e.target.value) })} className="w-full font-extrabold outline-none" /></label>
                            <label className="border rounded-lg px-2 py-1.5"><span className="text-[10px] font-bold text-slate-400 block">MANŒUVRES</span><input type="number" min={0} value={equipeCreate.manoeuvres} onChange={(e) => setEquipeCreate({ ...equipeCreate, manoeuvres: Number(e.target.value) })} className="w-full font-extrabold outline-none" /></label>
                            <label className="border rounded-lg px-2 py-1.5"><span className="text-[10px] font-bold text-slate-400 block">JOURS</span><input type="number" min={0} value={equipeCreate.jours} onChange={(e) => setEquipeCreate({ ...equipeCreate, jours: Number(e.target.value) })} className="w-full font-extrabold outline-none" /></label>
                            <label className="border rounded-lg px-2 py-1.5"><span className="text-[10px] font-bold text-slate-400 block">MAÇON /J</span><input type="number" min={0} step={500} value={equipeCreate.tauxMacon} onChange={(e) => setEquipeCreate({ ...equipeCreate, tauxMacon: Number(e.target.value) })} className="w-full font-extrabold outline-none" /></label>
                            <label className="border rounded-lg px-2 py-1.5"><span className="text-[10px] font-bold text-slate-400 block">MANŒUVRE /J</span><input type="number" min={0} step={500} value={equipeCreate.tauxManoeuvre} onChange={(e) => setEquipeCreate({ ...equipeCreate, tauxManoeuvre: Number(e.target.value) })} className="w-full font-extrabold outline-none" /></label>
                            <div className="bg-[#0F172A] text-white rounded-lg px-2 py-1.5"><span className="text-[10px] font-bold text-white/60 block">TOTAL</span><p className="font-extrabold text-[13px]">{fcfa(montantEquipe(equipeCreate))}</p></div>
                          </div>
                          <p className="text-[12px] text-slate-500 mt-1.5">Maçon à {fcfa(7000)}/jour et manœuvre à {fcfa(4000)}/jour par défaut (taux modifiables).</p>
                        </>
                      )}
                    </div>
                    <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 mt-3">
                      <span className="text-xs font-extrabold text-amber-900 flex items-center gap-1.5"><Clock size={14} /> VALIDITÉ DE L'OFFRE</span>
                      <div className="flex gap-2 mt-2">
                        {[7, 15, 30].map((j) => (
                          <button type="button" key={j} onClick={() => setValiditeCreate(j)} className={`flex-1 py-2 rounded-lg font-extrabold text-[13px] border-2 ${validiteCreate === j ? "bg-amber-500 text-white border-amber-500" : "bg-white text-slate-500 border-slate-200"}`}>{j} jours</button>
                        ))}
                      </div>
                      <p className="text-[12px] text-amber-900/70 mt-1.5">Clause automatique de révision des prix si les matériaux augmentent en Côte d'Ivoire (imprimée sur le PDF).</p>
                    </div>
                    <div className="bg-slate-900 text-white rounded-xl p-3 mt-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-extrabold flex items-center gap-1.5"><Lock size={14} className="text-[#FCD34D]" /> MARGE ET IMPRÉVUS — SECRET</span>
                        <div className="flex items-center bg-white text-slate-900 rounded-lg overflow-hidden shrink-0">
                          <input type="number" min={0} max={100} value={margeCreatePct} onChange={(e) => setMargeCreatePct(Math.min(100, Math.max(0, Number(e.target.value))))} className="w-12 text-center py-1.5 font-extrabold outline-none" />
                          <span className="pr-2 font-bold text-slate-500 text-sm">%</span>
                        </div>
                      </div>
                      <input type="range" min={0} max={50} step={1} value={margeCreatePct} onChange={(e) => setMargeCreatePct(Number(e.target.value))} className="w-full accent-[#F59E0B] mt-2" />
                      <p className="text-[12px] text-white/65">Majore tous les prix unitaires du devis client. Invisible sur le PDF et WhatsApp — visible uniquement par vous.</p>
                    </div>
                  </div>
                )}
              </div>
              </>)}

              {/* Photo plan — Étape 2 */}
              {createStep === 2 && (<>
              <div>
                <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5"><Camera size={13} /> PHOTO DU PLAN (RECOMMANDÉ)</span>
                <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handlePhoto(f); }} />
                {!photo ? (
                  <button onClick={() => fileRef.current?.click()} className="w-full mt-1.5 border-2 border-dashed border-slate-300 rounded-2xl py-7 grid place-items-center text-center hover:border-[#F59E0B] hover:bg-orange-50/50 transition">
                    <span className="bg-orange-100 text-[#D97706] w-12 h-12 rounded-2xl grid place-items-center"><Upload size={22} /></span>
                    <span className="font-bold text-sm mt-2.5">Photographier ou importer le plan</span>
                    <span className="text-xs text-slate-500 mt-1 px-4">Plan papier, capture WhatsApp, croquis… L'IA en déduit les surfaces. JPG / PNG.</span>
                  </button>
                ) : (
                  <div className="mt-1.5 relative rounded-2xl overflow-hidden border-2 border-emerald-200">
                    <img src={photo.url} alt="Plan du chantier" className="w-full h-44 object-cover" />
                    {generating && <div className="absolute inset-x-0 h-1 bg-[#F59E0B] shadow-[0_0_18px_#F59E0B] scanline" />}
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/75 to-transparent text-white p-3 pt-8 flex items-end gap-2">
                      <div className="flex-1 min-w-0"><p className="font-bold text-[13px] truncate">{photo.name}</p><p className="text-[11px] text-white/75">{photo.size} • Prêt pour analyse IA</p></div>
                      <span className="bg-emerald-500 text-[11px] font-bold px-2 py-1 rounded-full flex items-center gap-1 shrink-0"><Check size={11} /> Reçu</span>
                      <button onClick={() => setPhoto(null)} className="bg-white/20 p-1.5 rounded-lg shrink-0" aria-label="Retirer la photo"><X size={14} /></button>
                    </div>
                  </div>
                )}
                <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1"><Sparkles size={11} className="text-[#F59E0B]" /> Avec l'offre Illimitée (24 900 FCFA), l'analyse photo est prioritaire et plus détaillée.</p>
              </div>
              </>)}
            </div>

            {/* Vérification — Étape 3 */}
            {createStep === 3 && (
              <section className="card rounded-[1.75rem] p-5 animate-scaleIn">
                <h3 className="font-extrabold flex items-center gap-2"><FileCheck className="text-[#D97706]" size={19} /> Vérification avant génération</h3>
                <div className="grid sm:grid-cols-2 gap-2.5 mt-3 text-sm">
                  <div className="bg-[#F8FAFC] border border-slate-200 rounded-2xl p-3.5"><p className="text-[11px] font-extrabold text-slate-400">CLIENT</p><p className="font-extrabold mt-1">{form.clientNom || "—"}</p><p className="text-slate-500 text-[13px]">{form.clientTel || "Téléphone non renseigné"}</p></div>
                  <div className="bg-[#F8FAFC] border border-slate-200 rounded-2xl p-3.5"><p className="text-[11px] font-extrabold text-slate-400">CHANTIER</p><p className="font-extrabold mt-1 flex items-center gap-1"><MapPin size={14} className="text-[#D97706]" /> {form.lieu}</p><p className="text-slate-500 text-[13px]">{form.surface} m² • {form.nbPieces} pièces • {form.nbEtages} niveau(x)</p></div>
                  <div className="bg-[#F8FAFC] border border-slate-200 rounded-2xl p-3.5 sm:col-span-2"><p className="text-[11px] font-extrabold text-slate-400">TRAVAUX</p><p className="font-medium mt-1 leading-snug">{form.natureTravaux || "—"}</p><p className="text-slate-500 text-[13px] mt-1">{photo ? `Plan joint : ${photo.name} (${photo.size}) — analyse IA activée` : "Aucune photo de plan — estimation depuis la description"}</p></div>
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5"><p className="text-[11px] font-extrabold text-amber-700">PARAMÈTRES IA</p><p className="text-[13px] font-semibold mt-1">Ciment {fcfa(prixPerso.cimentSac50)}/sac • MO {moCreateMode === "equipe" ? `équipe (${fcfa(montantEquipe(equipeCreate))})` : `${moCreatePct} %`} • Marge secrète {margeCreatePct} % • Validité {validiteCreate} j</p></div>
                  <div className="bg-slate-900 text-white rounded-2xl p-3.5"><p className="text-[11px] font-extrabold text-white/50">APRÈS GÉNÉRATION</p><p className="text-[13px] font-semibold mt-1">Vous choisirez le format d'export : Général, Matériaux ou DQE Complet, avec aperçu en temps réel.</p></div>
                </div>
                <label className={`mt-3 flex items-start gap-3 rounded-2xl border-2 p-3.5 cursor-pointer ${materiauxCreate ? "bg-teal-50 border-teal-500" : "bg-slate-50 border-slate-200"}`}>
                  <input type="checkbox" checked={materiauxCreate} onChange={(e) => setMateriauxCreate(e.target.checked)} className="mt-0.5 w-6 h-6 accent-teal-600 shrink-0" />
                  <span><b className="text-sm">Matériaux fournis par le client</b><span className="block text-[12px] text-slate-500 mt-0.5">Mode main-d'œuvre seule : le client recevra la liste des quantités de matériaux sans prix, et ne paiera que votre main-d'œuvre.</span></span>
                </label>
              </section>
            )}

            {createStep === 3 && (
            <button onClick={generateDevis} disabled={generating} className="w-full bg-[#F59E0B] hover:bg-[#D97706] disabled:opacity-70 text-white font-extrabold text-[16px] py-4 rounded-2xl shadow-xl shadow-amber-200 flex items-center justify-center gap-2">
              {generating ? <><Sparkles className="animate-pulseSoft" /> L'IA chiffre votre chantier…</> : <><Sparkles /> Générer et ouvrir l'aperçu/export — 1 crédit</>}
            </button>
            )}
            {generating && (
              <div className="card rounded-3xl p-5 animate-scaleIn overflow-hidden">
                <div className="flex items-center gap-3">
                  <span className="bg-amber-100 text-[#D97706] w-11 h-11 rounded-2xl grid place-items-center shrink-0"><Sparkles className="animate-pulseSoft" size={21} /></span>
                  <div className="min-w-0"><p className="font-extrabold">L'IA prépare votre devis…</p><p className="text-xs text-slate-500">Normes CI, planning et prix appliqués en temps réel.</p></div>
                  <span className="ml-auto font-extrabold text-[#D97706] tnum">{Math.round(((genStep + 1) / 4) * 100)} %</span>
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full mt-4 overflow-hidden relative">
                  <div className="h-full bg-[#F59E0B] rounded-full transition-all duration-700" style={{ width: `${((genStep + 1) / 4) * 100}%` }} />
                  <div className="absolute inset-y-0 w-16 bg-white/40 blur-sm progress-stripe" />
                </div>
                <div className="space-y-2.5 mt-4">
                  {["Analyse du plan & de la description", "Quantités selon normes CI (13 agglos/m², béton 350 kg/m³, acier 90/50 kg/m³)", "Vos prix Mes Prix appliqués (ciment, agglos, fers, sable, gravier)", moCreateMode === "equipe" ? "Main-d'œuvre par équipe + planning et assemblage du DQE" : `Main-d'œuvre ${moCreatePct} % + planning et assemblage du DQE`].map((s, i) => (
                    <div key={i} className={`flex items-center gap-2.5 text-sm font-semibold transition-all ${i < genStep ? "text-emerald-600" : i === genStep ? "text-[#0F172A]" : "text-slate-300"}`}>
                      {i < genStep ? <CheckCircle2 size={18} className="animate-popIn" /> : i === genStep ? <Sparkles size={18} className="text-[#F59E0B] animate-pulseSoft" /> : <Clock size={18} />}{s}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Navigation du tunnel — gros boutons accessibles au pouce */}
            <div className="sticky bottom-[86px] md:bottom-3 z-20">
              <div className="bg-white/92 backdrop-blur-xl border border-slate-200 shadow-[0_18px_40px_-18px_rgb(15_23_42/.4)] rounded-[1.4rem] p-2 grid grid-cols-[auto_1fr] gap-2">
                <button disabled={createStep === 1} onClick={() => setCreateStep(Math.max(1, createStep - 1))}
                  className="disabled:opacity-35 bg-slate-100 text-slate-700 font-extrabold px-4 min-h-[52px] rounded-2xl flex items-center gap-1.5 active:scale-[.98] transition">
                  <ArrowLeftIcon size={17} /> Retour
                </button>
                {createStep < 3 ? (
                  <button
                    onClick={() => {
                      if (createStep === 1 && !form.clientNom.trim()) { showToast("Indiquez le nom du client pour continuer."); return; }
                      if (createStep === 2 && !form.natureTravaux.trim() && !photo) { showToast("Décrivez les travaux ou ajoutez la photo du plan."); return; }
                      setCreateStep(createStep + 1); window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="bg-[#F59E0B] hover:bg-[#D97706] text-white font-extrabold min-h-[52px] rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-amber-200 active:scale-[.98] transition">
                    Continuer <ArrowRight size={18} />
                  </button>
                ) : (
                  <div className="flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 font-extrabold min-h-[52px] rounded-2xl px-3 text-sm text-center">
                    <CheckCircle2 size={18} /> Prêt à générer — bouton ci-dessus
                  </div>
                )}
              </div>
            </div>
            <p className="text-center text-xs text-slate-400 flex items-center justify-center gap-1.5"><ShieldCheck size={13} /> Estimation indicative — vous ajustez chaque prix avant envoi au client.</p>
          </div>
        )}

        {tab === "devis" && (
          <div className="space-y-3.5 animate-fadeUp">
            <div className="flex items-center justify-between"><div><h2 className="font-extrabold text-xl">Mes devis</h2><p className="text-sm text-slate-500">{devisList.length} devis • {fcfa(stats?.totalMontant || 0)} devisés au total</p></div>
              <button onClick={goNouveau} className="bg-[#F59E0B] text-white font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 text-sm shadow-lg shrink-0"><Plus size={16} /> Nouveau</button></div>
            <div className="sticky top-[68px] z-20 -mx-3 sm:mx-0 px-3 sm:px-0 py-2 bg-[#F8FAFC]/95 backdrop-blur-xl">
            <div className="relative"><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un client, un lieu, un n°…" className="w-full bg-white border-2 border-slate-200 rounded-2xl pl-10 pr-10 py-3 font-medium outline-none focus:border-[#F59E0B]" />{search && <button onClick={() => setSearch("")} aria-label="Effacer la recherche" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"><X size={16} /></button>}</div>
            <div className="flex flex-wrap gap-2 mt-2">{([["tous", "Tous"], ["pret", "Prêts"], ["envoye", "Envoyés"], ["signe", "Validés"], ["brouillon", "Brouillons"]] as [string, string][]).map(([k, l]) => {
              const n = k === "tous" ? devisList.length : devisList.filter((x) => x.statut === k).length;
              return (
                <button key={k} onClick={() => setFiltreStatut(k)} className={`px-3 py-2 rounded-full text-[12.5px] font-bold flex items-center gap-1.5 transition active:scale-95 ${filtreStatut === k ? "bg-[#0F172A] text-white shadow" : "bg-white border border-slate-200 text-slate-600"}`}>
                  {l}<span className={`text-[10.5px] font-extrabold px-1.5 py-0.5 rounded-full tnum ${filtreStatut === k ? "bg-white/20" : "bg-slate-100 text-slate-500"}`}>{n}</span>
                </button>
              );
            })}</div>
            {(search || filtreStatut !== "tous") && (
              <div className="flex items-center justify-between mt-2 text-[12px] text-slate-500">
                <span><b className="tnum">{filtered.length}</b> résultat{filtered.length > 1 ? "s" : ""} sur {devisList.length}</span>
                <button onClick={() => { setSearch(""); setFiltreStatut("tous"); }} className="font-bold text-[#B45309]">Réinitialiser</button>
              </div>
            )}
            </div>
            {filtered.length === 0 ? <div className="bg-white rounded-3xl p-8 text-center border border-dashed border-slate-300"><FileText className="mx-auto text-slate-300" size={34} /><p className="font-bold mt-3">Aucun devis trouvé</p><p className="text-sm text-slate-500 mt-1">Essayez un autre filtre ou créez un nouveau devis.</p></div>
              : filtered.map(d => <DevisCard key={d.id} d={d} onOpen={() => openDevis(d.id)} onPdf={async () => { try { const r = await fetchAvecRecuperation(`/api/devis/${d.id}`); const j = await r.json(); if (!r.ok || !j.devis) { showToast(j.error || "Devis introuvable pour l'export PDF."); return; } await downloadPDF(j.devis, j.lignes || [], j.planning || []); } catch { showToast("Export PDF impossible : vérifiez votre connexion."); } }} onWa={() => partagerDevisParId(d.id)} onAchats={() => openAchats(d)} onAcompte={() => openAcompte(d)} onAvenant={() => openAvenant(d)} />)}
          </div>
        )}

        {tab === "entreprise" && (
          <div className="space-y-4 animate-fadeUp max-w-2xl mx-auto">
            <div>
              <h2 className="font-extrabold text-xl flex items-center gap-2"><Building2 className="text-[#D97706]" /> Mon Entreprise</h2>
              <p className="text-sm text-slate-500 mt-0.5">Logo, signature, cachet, RCCM et Compte Contribuable : tout apparaît automatiquement sur vos devis et factures PDF.</p>
              <div className="mt-3 bg-white border border-slate-200 rounded-2xl px-4 py-3 flex items-center gap-3">
                <span className="bg-slate-100 text-slate-500 w-9 h-9 rounded-xl grid place-items-center shrink-0"><Mail size={16} /></span>
                <div className="min-w-0 flex-1"><p className="text-[11px] font-extrabold text-slate-400">COMPTE CONNECTÉ</p><p className="font-bold text-[13px] truncate">{compte?.email}</p></div>
                <button onClick={seDeconnecter} className="bg-red-50 text-red-600 border border-red-200 text-xs font-extrabold px-3 py-2 rounded-xl shrink-0 flex items-center gap-1.5"><LogOut size={14} /> Déconnexion</button>
              </div>
            </div>

            {!profilForm ? (
              <div className="bg-white rounded-3xl p-8 text-center border border-dashed border-slate-300">
                <Building2 className="mx-auto text-slate-300" size={34} />
                <p className="font-bold mt-3">Chargement du profil…</p>
                <button onClick={goEntreprise} className="mt-3 bg-[#0F172A] text-white font-bold px-4 py-2.5 rounded-xl text-sm">Réessayer</button>
              </div>
            ) : (
              <>
                <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 space-y-3.5">
                  <p className="text-xs font-extrabold text-slate-500">IDENTITÉ DE L'ENTREPRISE</p>
                  <label className="block"><span className="text-xs font-bold text-slate-600">NOM DE L'ENTREPRISE *</span>
                    <input value={profilForm.nom || ""} onChange={(e) => setProfilForm({ ...profilForm, nom: e.target.value })} placeholder="Ex : SARL Bâtir Ivoire" className="w-full border-2 border-slate-200 rounded-2xl px-4 py-3 mt-1 font-semibold outline-none focus:border-[#F59E0B]" /></label>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <label className="block"><span className="text-xs font-bold text-slate-600">DIRIGEANT / SIGNATAIRE</span>
                      <input value={profilForm.proprietaire || ""} onChange={(e) => setProfilForm({ ...profilForm, proprietaire: e.target.value })} placeholder="Ex : Kouadio Yao" className="w-full border-2 border-slate-200 rounded-2xl px-4 py-3 mt-1 font-medium outline-none focus:border-[#F59E0B]" /></label>
                    <label className="block"><span className="text-xs font-bold text-slate-600">TÉLÉPHONE / WHATSAPP</span>
                      <input value={profilForm.telephone || ""} onChange={(e) => setProfilForm({ ...profilForm, telephone: e.target.value })} placeholder="+225 07 07 12 34 56" className="w-full border-2 border-slate-200 rounded-2xl px-4 py-3 mt-1 font-medium outline-none focus:border-[#F59E0B]" /></label>
                    <label className="block"><span className="text-xs font-bold text-slate-600">EMAIL</span>
                      <input value={profilForm.email || ""} onChange={(e) => setProfilForm({ ...profilForm, email: e.target.value })} placeholder="contact@entreprise.ci" className="w-full border-2 border-slate-200 rounded-2xl px-4 py-3 mt-1 font-medium outline-none focus:border-[#F59E0B]" /></label>
                    <label className="block"><span className="text-xs font-bold text-slate-600">VILLE / COMMUNE</span>
                      <input value={profilForm.ville || ""} onChange={(e) => setProfilForm({ ...profilForm, ville: e.target.value })} placeholder="Abidjan, Cocody" className="w-full border-2 border-slate-200 rounded-2xl px-4 py-3 mt-1 font-medium outline-none focus:border-[#F59E0B]" /></label>
                  </div>
                  <label className="block"><span className="text-xs font-bold text-slate-600 flex items-center gap-1"><MapPin size={12} /> ADRESSE COMPLÈTE (ENTÊTE + PIED DE PAGE DES PDF)</span>
                    <input value={profilForm.adresse || ""} onChange={(e) => setProfilForm({ ...profilForm, adresse: e.target.value })} placeholder="Ex : Rue des Jardins, Cocody, Abidjan, Côte d'Ivoire" className="w-full border-2 border-slate-200 rounded-2xl px-4 py-3 mt-1 font-medium outline-none focus:border-[#F59E0B]" /></label>
                </div>

                <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 space-y-3.5">
                  <p className="text-xs font-extrabold text-slate-500 flex items-center gap-1.5"><Landmark size={14} className="text-[#009A44]" /> MENTIONS LÉGALES (PIED DE PAGE DES PDF)</p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <label className="block"><span className="text-xs font-bold text-slate-600">RCCM</span>
                      <input value={profilForm.rccm || ""} onChange={(e) => setProfilForm({ ...profilForm, rccm: e.target.value })} placeholder="Ex : CI-ABJ-2024-B-12 345" className="w-full border-2 border-slate-200 rounded-2xl px-4 py-3 mt-1 font-medium outline-none focus:border-[#F59E0B]" /></label>
                    <label className="block"><span className="text-xs font-bold text-slate-600">COMPTE CONTRIBUABLE (CC)</span>
                      <input value={profilForm.compteContribuable || ""} onChange={(e) => setProfilForm({ ...profilForm, compteContribuable: e.target.value })} placeholder="Ex : CC 2 412 345 A" className="w-full border-2 border-slate-200 rounded-2xl px-4 py-3 mt-1 font-medium outline-none focus:border-[#F59E0B]" /></label>
                  </div>
                </div>

                <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
                  <p className="text-xs font-extrabold text-slate-500">LOGO, SIGNATURE & CACHET</p>
                  <p className="text-xs text-slate-400 mt-1">Fond transparent (PNG) recommandé pour la signature et le cachet. Images compressées automatiquement.</p>
                  <div className="grid sm:grid-cols-3 gap-3 mt-3">
                    <ImageUploadField label="LOGO ENTREPRISE" hint="Affiché en haut à gauche de chaque PDF" icon={ImagePlus} data={profilForm.logoData || ""} nom={profilForm.logoNom || ""}
                      onFile={async (f) => { try { const data = await traiterImage(f); setProfilForm({ ...profilForm, logoData: data, logoNom: f.name }); } catch { showToast("Image illisible."); } }}
                      onRemove={() => setProfilForm({ ...profilForm, logoData: "", logoNom: "" })} />
                    <ImageUploadField label="SIGNATURE" hint="Signée sur fond blanc ou transparent, elle sera apposée sur les devis" icon={PenLine} data={profilForm.signatureData || ""} nom={profilForm.signatureNom || ""}
                      onFile={async (f) => { try { const data = await traiterImage(f); setProfilForm({ ...profilForm, signatureData: data, signatureNom: f.name }); } catch { showToast("Image illisible."); } }}
                      onRemove={() => setProfilForm({ ...profilForm, signatureData: "", signatureNom: "" })} />
                    <ImageUploadField label="CACHET / TAMPON" hint="Tampon de l'entreprise, apposé à côté de la signature" icon={Stamp} data={profilForm.cachetData || ""} nom={profilForm.cachetNom || ""}
                      onFile={async (f) => { try { const data = await traiterImage(f); setProfilForm({ ...profilForm, cachetData: data, cachetNom: f.name }); } catch { showToast("Image illisible."); } }}
                      onRemove={() => setProfilForm({ ...profilForm, cachetData: "", cachetNom: "" })} />
                  </div>
                </div>

                {/* Installer l'application (PWA) */}
                <div className="bg-[#0F172A] text-white rounded-3xl p-5 shadow-xl">
                  <p className="text-xs font-extrabold text-amber-300 flex items-center gap-1.5"><Smartphone size={14} /> INSTALLER L'APPLICATION</p>
                  <p className="text-[13px] text-white/70 mt-1.5">Ajoutez DevisBTP CI à votre écran d'accueil : lancement en un toucher sur le chantier, mode plein écran et fonctionnement hors-ligne.</p>
                  <div className="grid gap-2 mt-3">
                    <button
                      onClick={async () => {
                        if (installPrompt) { await installPrompt.prompt(); setInstallPrompt(null); }
                        else showToast("Sur iPhone : bouton Partager ⬆️ puis « Sur l'écran d'accueil ». Sur Android : menu ⋮ puis « Installer l'application ».");
                      }}
                      className="w-full bg-[#F59E0B] hover:bg-[#D97706] text-white font-extrabold py-3.5 rounded-2xl flex items-center justify-center gap-2 active:scale-[.98] transition">
                      <Download size={18} /> Installer DevisBTP CI
                    </button>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-2 mt-2.5">
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
                      <p className="text-[12px] font-extrabold text-white/85">Android / Chrome</p>
                      <p className="text-[12px] text-white/60 mt-0.5">Menu ⋮ → « Installer l'application » ou le bouton ci-dessus.</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
                      <p className="text-[12px] font-extrabold text-white/85">iPhone / Safari</p>
                      <p className="text-[12px] text-white/60 mt-0.5">Bouton Partager ⬆️ → « Sur l'écran d'accueil » → Ajouter.</p>
                    </div>
                  </div>
                </div>

                {/* Aperçu PDF */}
                <div className="bg-[#0F172A] text-white rounded-3xl p-5 shadow-xl">
                  <p className="text-xs font-extrabold text-emerald-300 flex items-center gap-1.5"><Eye size={14} /> APERÇU SUR VOS PDF</p>
                  <div className="bg-white text-slate-900 rounded-2xl mt-3 overflow-hidden">
                    <div className="bg-[#0F172A] text-white px-4 py-3 flex items-center gap-3">
                      {profilForm.logoData ? <img src={profilForm.logoData} alt="" className="w-10 h-10 object-contain bg-white rounded-lg" /> : <span className="bg-[#F59E0B] w-10 h-10 rounded-lg grid place-items-center shrink-0"><Building2 size={19} /></span>}
                      <div className="min-w-0">
                        <p className="font-extrabold truncate">{profilForm.nom || "Votre entreprise"}</p>
                        <p className="text-[11px] text-white/65 truncate">{profilForm.adresse || profilForm.ville || "Adresse"} • {profilForm.telephone || ""}</p>
                        <p className="text-[11px] text-white/65 truncate">{[profilForm.rccm ? `RCCM : ${profilForm.rccm}` : "", profilForm.compteContribuable ? `CC : ${profilForm.compteContribuable}` : ""].filter(Boolean).join("  •  ") || "RCCM et CC apparaîtront ici"}</p>
                      </div>
                      <span className="ml-auto font-extrabold text-sm shrink-0">DV-2026-…</span>
                    </div>
                    <div className="px-4 py-3 flex items-end justify-between gap-3">
                      <p className="text-xs text-slate-400">… détail du devis …</p>
                      <div className="text-right relative">
                        <p className="text-xs font-bold">Pour {profilForm.nom || "l'entreprise"}</p>
                        <p className="text-[11px] text-slate-400">{profilForm.proprietaire || ""}</p>
                        <div className="flex items-end justify-end gap-1 mt-1">
                          {profilForm.signatureData && <img src={profilForm.signatureData} alt="" className="h-8 object-contain" />}
                          {profilForm.cachetData && <img src={profilForm.cachetData} alt="" className="h-11 object-contain" />}
                          {!profilForm.signatureData && !profilForm.cachetData && <span className="text-[11px] text-slate-300">Signature et cachet ici</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <button onClick={saveProfil} disabled={savingProfil} className="w-full bg-[#F59E0B] hover:bg-[#D97706] disabled:opacity-60 text-white font-extrabold py-4 rounded-2xl shadow-xl shadow-amber-200 flex items-center justify-center gap-2 sticky bottom-24 md:bottom-4">
                  <Save size={18} /> {savingProfil ? "Enregistrement…" : "Enregistrer mon profil entreprise"}
                </button>
              </>
            )}
          </div>
        )}

        {tab === "prix" && (
          <div className="space-y-4 animate-fadeUp max-w-3xl mx-auto">
            <div>
              <h2 className="font-extrabold text-[22px] tracking-tight flex items-center gap-2"><Tag className="text-[#D97706]" /> Mes Prix</h2>
              <p className="text-sm text-slate-500 mt-0.5">Vos prix matériaux personnels, utilisés par l'IA dans chaque nouveau devis. Enregistrés automatiquement sur cet appareil.</p>
            </div>

            <section className="card rounded-[1.75rem] p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-extrabold flex items-center gap-2"><Calculator className="text-[#D97706]" size={18} /> Prix matériaux par défaut (FCFA)</h3>
                <button onClick={() => { setPrixPerso({ ...PRIX_DEFAUT }); showToast("Prix réinitialisés aux valeurs du marché CI."); }} className="text-xs font-extrabold text-[#B45309] bg-amber-50 border border-amber-200 rounded-full px-3 py-2 shrink-0">Réinitialiser CI</button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-2 gap-2.5 mt-4">
                {([
                  ["cimentSac50", "Ciment — sac 50 kg", "sac"],
                  ["agglo15Creux", "Agglo 15 creux", "pièce"],
                  ["ferHA10Barre12m", "Fer HA10 — barre 12 m", "barre"],
                  ["ferHA12Barre12m", "Fer HA12 — barre 12 m", "barre"],
                  ["ferHA6Barre12m", "Fer HA6 — barre 12 m", "barre"],
                  ["sableM3", "Sable", "m³"],
                  ["gravierM3", "Gravier", "m³"],
                  ["colleCarrelageSac25", "Colle carrelage — sac 25 kg", "sac"],
                ] as const).map(([key, label, unite]) => (
                  <label key={key} className="bg-[#F8FAFC] border border-slate-200 rounded-2xl px-3.5 py-3 focus-within:border-[#F59E0B] transition">
                    <span className="text-[11px] font-extrabold text-slate-500 block leading-tight">{label}</span>
                    <span className="flex items-baseline gap-1 mt-1">
                      <input type="number" min={0} value={prixPerso[key]} onChange={(e) => setPrixPerso({ ...prixPerso, [key]: Number(e.target.value) })} className="w-full min-w-0 bg-transparent font-extrabold text-[17px] outline-none tnum" />
                      <span className="text-[11px] font-bold text-slate-400 shrink-0">FCFA / {unite}</span>
                    </span>
                    {prixPerso[key] !== PRIX_DEFAUT[key] && <span className="text-[10px] font-bold text-[#B45309]">Personnalisé (défaut CI : {new Intl.NumberFormat("fr-FR").format(PRIX_DEFAUT[key])})</span>}
                  </label>
                ))}
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 mt-3">
                <p className="text-xs font-extrabold text-slate-500">NORMES APPLIQUÉES PAR L'IA</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {["13 agglos/m²", "Béton 350 : 7 sacs/m³", "Acier 90 / 50 kg/m³", "Carrelage +10 %", "Colle 1 sac / 4,5 m²", "MO 30 % ou par équipe"].map((chip) => <span key={chip} className="bg-white border border-slate-200 text-slate-600 text-[11px] font-bold px-2.5 py-1 rounded-full">{chip}</span>)}
                </div>
              </div>
              <button onClick={goNouveau} className="mt-4 w-full bg-[#0F172A] text-white font-extrabold py-3.5 rounded-2xl flex items-center justify-center gap-2 active:scale-[.98] transition"><Sparkles size={17} /> Utiliser ces prix dans un nouveau devis</button>
            </section>

            <section className="card rounded-[1.75rem] p-5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-extrabold flex items-center gap-2"><LayoutTemplate className="text-[#D97706]" size={18} /> Format PDF par défaut</h3>
                {savingFormat && <span className="text-[11px] font-bold text-slate-400">Enregistrement…</span>}
              </div>
              <p className="text-sm text-slate-500 mt-1">Appliqué automatiquement à chaque nouveau devis, au PDF téléchargé et au message WhatsApp.</p>
              <div className="grid gap-2 mt-3">
                {[
                  { id: "general" as FormatPdf, label: "Option A — Devis Général", desc: "Résumé par grandes étapes, sans quantités ni détails techniques. Recommandé pour le client.", reco: true },
                  { id: "materiaux" as FormatPdf, label: "Option B — Par Matériaux", desc: "Totaux par catégories (ciment, fer, agglos, main-d'œuvre…), sans ratios.", reco: false },
                  { id: "detaille" as FormatPdf, label: "Option C — DQE Complet", desc: "Toutes les lignes, quantités, unités et prix unitaires.", reco: false },
                ].map((f) => (
                  <button key={f.id} onClick={() => enregistrerFormatDefaut(f.id)} className={`text-left border-2 rounded-2xl p-3.5 transition active:scale-[.99] ${formatDefaut === f.id ? "border-[#F59E0B] bg-amber-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
                    <span className="flex items-start gap-2.5">
                      <span className={`mt-0.5 w-5 h-5 rounded-full border-2 grid place-items-center shrink-0 ${formatDefaut === f.id ? "border-[#F59E0B] bg-[#F59E0B]" : "border-slate-300"}`}>{formatDefaut === f.id && <Check size={13} className="text-white" />}</span>
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-1.5"><b className="text-[13.5px]">{f.label}</b>{f.reco && <span className="bg-[#0F172A] text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full">RECOMMANDÉ</span>}</span>
                        <span className="block text-[12px] text-slate-500 mt-0.5 leading-snug">{f.desc}</span>
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </section>

            <section className="card rounded-[1.75rem] p-5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-extrabold flex items-center gap-2"><Zap className="text-[#D97706]" size={18} /> Diagnostic de génération</h3>
                <button onClick={lancerDiagnostic} disabled={diag?.statut === "encours"} className="bg-[#0F172A] text-white text-xs font-extrabold px-3 py-2 rounded-xl disabled:opacity-50">
                  {diag?.statut === "encours" ? "Test en cours…" : "Lancer le test"}
                </button>
              </div>
              <p className="text-[13px] text-slate-500 mt-1">Vérifie la session, le serveur et le moteur de calcul IA. Test technique gratuit : aucun crédit consommé, aucun devis créé.</p>
              {diag?.lignes?.length ? (
                <div className="mt-3 space-y-1.5">
                  {diag.lignes.map((l) => (
                    <div key={l.label} className={`rounded-xl px-3 py-2 text-[12.5px] flex items-start gap-2 ${l.ok ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                      <span className="font-extrabold shrink-0">{l.ok ? "✓" : "✕"} {l.label}</span>
                      <span className="min-w-0 opacity-90">{l.detail}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[12px] text-slate-400 mt-2">Compte connecté : <b>{compte?.email || "—"}</b> · Rôle : <b>{compte?.role || "client"}</b> · Crédits : <b>{creditsLabel}</b> · Version interface : <b>{APP_VERSION}</b></p>
              )}
            </section>

            {compte?.role === "fondateur" && (
              <section className="bg-slate-900 text-white rounded-[1.75rem] p-5 shadow-xl">
                <div className="flex items-center gap-2"><Crown className="text-[#FCD34D]" size={19} /><h3 className="font-extrabold">Vous êtes fondateur</h3></div>
                <p className="text-[13px] text-white/65 mt-1">Accès complet et illimité. Vous contrôlez aussi les accès des autres utilisateurs, les paiements et les activations.</p>
                <a href="/admin" className="mt-3 inline-flex items-center justify-center gap-2 bg-[#F59E0B] hover:bg-[#D97706] text-white font-extrabold px-4 py-3 rounded-2xl w-full active:scale-[.98] transition"><ShieldCheck size={17} /> Ouvrir l'espace fondateur / admin</a>
              </section>
            )}

            <section className="card rounded-[1.75rem] p-5">
              <h3 className="font-extrabold flex items-center gap-2"><Coins className="text-[#D97706]" size={18} /> Mes crédits devis</h3>
              <p className="text-sm text-slate-500 mt-1">Solde actuel : <b className="text-[#B45309] tnum">{creditsLabel}</b> • Offre : {entreprise?.plan || "gratuit"}. Paiement direct par <b>Wave</b> ou <b>Orange Money</b> ci-dessous : déblocage immédiat avec votre ID de transaction, contrôle administrateur a posteriori.</p>
            </section>

            <section className="bg-slate-900 text-white rounded-[1.75rem] p-5 shadow-xl">
              <h3 className="font-extrabold flex items-center gap-2"><Lock className="text-[#FCD34D]" size={18} /> Code fondateur / collaborateur</h3>
              <p className="text-[13px] text-white/65 mt-1">Vous faites partie de l'équipe DevisBTP CI ? Entrez le code qui vous a été transmis pour un accès complet et illimité permanent.</p>
              <div className="flex gap-2 mt-3">
                <input value={codeFondateur} onChange={(e) => setCodeFondateur(e.target.value)} placeholder="DEVISBTP-••••-••••" className="flex-1 min-w-0 bg-white/10 border border-white/20 rounded-xl px-3.5 py-3 font-bold outline-none placeholder:text-white/30 uppercase" />
                <button onClick={appliquerCodeFondateur} className="bg-[#F59E0B] hover:bg-[#D97706] text-white font-extrabold px-4 rounded-xl shrink-0 active:scale-[.98] transition">Activer</button>
              </div>
            </section>

            <div className="space-y-3.5">
              <PricingCard titre="Devis Unique" prix="4 900" unite="FCFA / devis" desc="Pour tester ou un besoin ponctuel" features={["1 devis DQE généré par IA", "Prix du marché ivoirien à jour", "Édition prix & quantités illimitée", "PDF propre + partage WhatsApp"]} onPayWave={() => ouvrirPaiement("unique", "Wave")} onPayOM={() => ouvrirPaiement("unique", "Orange Money")} />
              <PricingCard populaire titre="Pack Pro" prix="9 900" unite="FCFA / mois" desc="Pour les entrepreneurs actifs" features={["5 devis / mois", "Tout le Devis Unique inclus", "Historique & duplicata de devis", "Support WhatsApp prioritaire"]} onPayWave={() => ouvrirPaiement("pack5", "Wave")} onPayOM={() => ouvrirPaiement("pack5", "Orange Money")} />
              <PricingCard illimite titre="Illimité + Plan IA" prix="24 900" unite="FCFA / mois" desc="Pour les entreprises qui chiffrent chaque semaine" features={["Devis illimités", "Analyse avancée de la photo du plan", "Modèles par type de chantier (villa, clôture…)", "Logo entreprise sur les PDF", "Support dédié 7j/7"]} onPayWave={() => ouvrirPaiement("illimite", "Wave")} onPayOM={() => ouvrirPaiement("illimite", "Orange Money")} />
            </div>

            <div className="bg-white rounded-3xl p-5 border shadow-sm">
              <h3 className="font-extrabold flex items-center gap-2"><ShieldCheck className="text-[#009A44]" /> Comment se passe le paiement Wave / Orange Money ?</h3>
              <ol className="mt-3 space-y-2.5 text-sm text-slate-600">
                <li className="flex gap-2.5"><b className="bg-[#0F172A] text-white w-5 h-5 rounded-full grid place-items-center text-[11px] shrink-0">1</b> Cliquez « Payer avec Wave » (bleu) ou « Payer avec Orange Money » (orange) : la page de paiement du montant exact s'ouvre dans un nouvel onglet.</li>
                <li className="flex gap-2.5"><b className="bg-[#0F172A] text-white w-5 h-5 rounded-full grid place-items-center text-[11px] shrink-0">2</b> Revenez ici : le formulaire d'activation s'affiche déjà, avec le moyen choisi (Wave ou OM) enregistré.</li>
                <li className="flex gap-2.5"><b className="bg-[#0F172A] text-white w-5 h-5 rounded-full grid place-items-center text-[11px] shrink-0">3</b> Saisissez l'ID de transaction reçu par SMS et votre numéro : vos crédits sont débloqués instantanément. L'administrateur vérifie ensuite chaque référence (contrôle a posteriori).</li>
              </ol>
              <div className="flex gap-2 mt-4"><span className="flex-1 bg-[#1DC4F2]/15 border border-[#1DC4F2]/50 text-[#0B7EA4] font-extrabold text-center py-2.5 rounded-xl text-sm">WAVE</span><span className="flex-1 bg-[#FF7900]/10 border border-[#FF7900]/50 text-[#B45309] font-extrabold text-center py-2.5 rounded-xl text-sm">ORANGE MONEY</span></div>
            </div>

            <div className="grid sm:grid-cols-3 gap-2.5">
              {[{ n: "Kouadio Y.", v: "Entrepreneur, Yopougon", t: "« Un devis de villa en 2 minutes au lieu d'une soirée sur Excel. Le client a signé le lendemain. »" }, { n: "Fatou D.", v: "SARL FD Bâtiment, Bouaké", t: "« Les prix sont ceux du marché ici. J'ajuste juste ma marge et j'envoie sur WhatsApp. »" }, { n: "Jean-Marc K.", v: "Maçon-entrepreneur, Bassam", t: "« La photo du plan, c'est bluffant. Le Pack Pro est rentabilisé dès le 1er chantier. »" }].map((t, i) => (
                <figure key={i} className="bg-white rounded-2xl p-4 border shadow-sm"><div className="flex text-[#F59E0B]">{[...Array(5)].map((_, j) => <Star key={j} size={13} fill="currentColor" />)}</div><blockquote className="text-[13px] text-slate-600 mt-2 leading-snug">{t.t}</blockquote><figcaption className="mt-2.5"><b className="text-[13px]">{t.n}</b><span className="block text-[11px] text-slate-400">{t.v}</span></figcaption></figure>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className="max-w-6xl mx-auto px-4 pb-6 text-center text-xs text-slate-400 hidden md:block">DevisBTP CI — Conçu pour les entrepreneurs du bâtiment en Côte d'Ivoire • Prix indicatifs du marché CI, à confirmer avant commande • TVA CI 18%</footer>

      {/* Bottom nav mobile — 4 onglets + FAB central, pensée pour le pouce */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/92 backdrop-blur-xl border-t border-slate-200 shadow-[0_-12px_36px_-16px_rgb(15_23_42/.28)] pb-[max(env(safe-area-inset-bottom),8px)]">
        <div className="grid grid-cols-5 px-1 items-end">
          {([
            { k: "accueil" as Tab, Icon: Home, label: "Accueil" },
            { k: "devis" as Tab, Icon: FileText, label: "Mes Devis" },
          ]).map(({ k, Icon, label }) => (
            <button key={k} onClick={() => setTab(k)} className={`min-h-[58px] py-1.5 rounded-2xl flex flex-col items-center justify-center gap-0.5 text-[10.5px] font-extrabold transition active:scale-95 ${tab === k ? "text-[#B45309]" : "text-slate-400"}`}>
              <span className={`p-1.5 rounded-xl transition ${tab === k ? "bg-amber-100" : ""}`}><Icon size={21} /></span>{label}
            </button>
          ))}
          <div className="flex flex-col items-center justify-end min-h-[58px] pb-1">
            <button onClick={goNouveau} aria-label="Nouveau devis"
              className="w-14 h-14 -mt-8 rounded-full bg-[#F59E0B] text-white grid place-items-center shadow-[0_14px_30px_-8px_rgb(245_158_11/.75)] ring-4 ring-[#F8FAFC] active:scale-90 transition animate-popIn">
              <Plus size={28} strokeWidth={2.6} />
            </button>
            <span className={`text-[10.5px] font-extrabold mt-1 ${tab === "nouveau" ? "text-[#B45309]" : "text-slate-400"}`}>Nouveau</span>
          </div>
          {([
            { k: "prix" as Tab, Icon: Tag, label: "Mes Prix" },
            { k: "entreprise" as Tab, Icon: Building2, label: "Entreprise" },
          ]).map(({ k, Icon, label }) => (
            <button key={k} onClick={() => (k === "entreprise" ? goEntreprise() : setTab(k))} className={`min-h-[58px] py-1.5 rounded-2xl flex flex-col items-center justify-center gap-0.5 text-[10.5px] font-extrabold transition active:scale-95 ${tab === k ? "text-[#B45309]" : "text-slate-400"}`}>
              <span className={`p-1.5 rounded-xl transition ${tab === k ? "bg-amber-100" : ""}`}><Icon size={21} /></span>{label}
            </button>
          ))}
        </div>
      </nav>
      {renderProModals()}
      {renderPdfApercu()}
      {renderWhatsAppDestinataire()}

      {/* Erreur de génération — actionnable, jamais silencieuse */}
      {genError && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4" onClick={() => setGenError(null)}>
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 animate-scaleIn" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3">
              <span className="bg-amber-100 text-[#B45309] p-2.5 rounded-2xl shrink-0"><Zap size={20} /></span>
              <div className="flex-1 min-w-0">
                <h3 className="font-extrabold text-lg leading-tight">{genError.titre}</h3>
                <p className="text-[13px] text-slate-500 mt-1 leading-relaxed">{genError.message}</p>
              </div>
              <button onClick={() => setGenError(null)} className="p-2 bg-slate-100 rounded-xl shrink-0"><X size={16} /></button>
            </div>

            <div className="mt-3 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-[12px] text-slate-600">
              Compte : <b>{compte?.email || "—"}</b> · Rôle : <b>{compte?.role || "client"}</b> · Crédits : <b>{creditsLabel}</b> · Code : <b>{genError.code || "—"}</b>
            </div>

            {genError.code === "AUTH" && (
              <div className="mt-3 bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
                <p className="text-[12px] font-extrabold text-slate-500">RECONNEXION RAPIDE — VOTRE DEVIS SE GÉNÈRE ENSUITE AUTOMATIQUEMENT</p>
                <input readOnly value={reconnexion?.email || compte?.email || ""} className="w-full border-2 border-slate-200 rounded-xl px-3.5 py-2.5 mt-2 font-semibold text-slate-500 bg-white" />
                <input type="password" value={reconnexionPwd} onChange={(e) => setReconnexionPwd(e.target.value)} placeholder="Votre mot de passe" autoComplete="current-password"
                  className="w-full border-2 border-slate-200 rounded-xl px-3.5 py-3 mt-2 font-semibold outline-none focus:border-[#F59E0B]" />
                <button onClick={reconnexionEtRelance} className="mt-2 w-full bg-[#009A44] text-white font-extrabold py-3.5 rounded-xl flex items-center justify-center gap-2"><Zap size={17} /> Se reconnecter et générer</button>
              </div>
            )}
            <div className="grid gap-2 mt-3">
              {genError.code === "AUTH" ? (
                <button onClick={() => { setGenError(null); clearToken(); setCompte(null); setAuthChecked(true); setReconnexion(null); }} className="w-full bg-slate-900 text-white font-extrabold py-3 rounded-2xl text-sm">Changer de compte</button>
              ) : (
                <button onClick={() => { setGenError(null); generateDevis(); }} className="w-full bg-[#F59E0B] text-white font-extrabold py-3.5 rounded-2xl">Réessayer la génération</button>
              )}
              {(genError.code === "NO_CREDIT" || genError.code === "AUTH") && (
                <button onClick={() => { setGenError(null); setTab("prix"); }} className="w-full bg-slate-900 text-white font-extrabold py-3.5 rounded-2xl">Recharger / saisir un code fondateur</button>
              )}
              <button onClick={() => setGenError(null)} className="w-full font-bold text-slate-500 py-2.5 text-sm">Fermer</button>
            </div>
          </div>
        </div>
      )}

      {/* Finaliser l'activation instantanee (Wave / Orange Money) */}
      {activationModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4" onClick={() => !activating && setActivationModal(null)}>
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 animate-scaleIn max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {activationDone ? (
              <div className="text-center py-4">
                <span className="bg-emerald-100 text-emerald-600 w-16 h-16 rounded-full grid place-items-center mx-auto animate-popIn"><CheckCircle2 size={34} /></span>
                <h3 className="font-extrabold text-xl mt-4">Crédits activés instantanément !</h3>
                <p className="text-sm text-slate-500 mt-2">{activationDone.message}<br />Référence enregistrée : <b className="text-slate-700">{activationDone.activation?.transactionId}</b> ({activationDone.activation?.moyen})<br />Nouveau solde : <b className="text-[#B45309]">{entreprise?.plan === "illimite" ? "Illimité" : `${entreprise?.credits} crédit(s)`}</b></p>
                <p className="text-[12px] text-slate-400 mt-3 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">Votre paiement fera l'objet d'un contrôle a posteriori par l'administrateur sur l'application marchande. En cas de référence introuvable, les crédits pourront être retirés.</p>
                <button onClick={() => { setActivationModal(null); goNouveau(); }} className="mt-5 w-full bg-[#F59E0B] hover:bg-[#D97706] text-white font-extrabold py-3.5 rounded-2xl flex items-center justify-center gap-2"><Sparkles size={17} /> Créer mon devis maintenant</button>
                <button onClick={() => setActivationModal(null)} className="mt-2 w-full font-semibold text-slate-500 py-2 text-sm">Plus tard</button>
              </div>
            ) : (
              <>
                <div className="flex items-start gap-3">
                  <span className={`p-2.5 rounded-2xl shrink-0 text-white ${activationModal.moyen === "Wave" ? "bg-[#1DC4F2]" : "bg-[#FF7900]"}`}><Wallet size={20} /></span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-extrabold text-lg leading-tight">Finaliser l'activation instantanée</h3>
                    <p className="text-sm text-slate-500">{OFFRES_PAIEMENT[activationModal.offre]?.label} — {fcfa(OFFRES_PAIEMENT[activationModal.offre]?.montant || 0)}</p>
                  </div>
                  <button onClick={() => setActivationModal(null)} className="p-2 bg-slate-100 rounded-xl shrink-0"><X size={16} /></button>
                </div>

                <div className={`mt-4 rounded-2xl border p-3.5 flex items-center gap-3 ${activationModal.moyen === "Wave" ? "bg-[#1DC4F2]/10 border-[#1DC4F2]/50" : "bg-[#FF7900]/10 border-[#FF7900]/50"}`}>
                  <span className={`text-white font-extrabold text-[12px] px-3 py-2 rounded-xl shrink-0 ${activationModal.moyen === "Wave" ? "bg-[#1DC4F2]" : "bg-[#FF7900]"}`}>{activationModal.moyen === "Wave" ? "WAVE" : "ORANGE MONEY"}</span>
                  <p className="text-[13px] text-slate-600">Moyen enregistré : <b>{activationModal.moyen}</b>. Terminez le paiement dans l'onglet qui vient de s'ouvrir, puis saisissez la référence reçue par SMS.</p>
                </div>
                <button onClick={() => window.open(activationModal.moyen === "Wave" ? OFFRES_PAIEMENT[activationModal.offre].wave : OFFRES_PAIEMENT[activationModal.offre].orangeMoney, "_blank", "noopener,noreferrer")} className="mt-3 w-full bg-slate-900 text-white font-bold py-3 rounded-2xl text-sm">Rouvrir la page de paiement {activationModal.moyen}</button>

                <label className="block mt-4"><span className="text-xs font-bold text-slate-500">ID DE TRANSACTION (REÇU PAR SMS {activationModal.moyen.toUpperCase()}) *</span>
                  <input value={activationForm.transactionId} onChange={(e) => setActivationForm({ ...activationForm, transactionId: e.target.value })} placeholder={activationModal.moyen === "Wave" ? "Ex : MP260512.1432.C12345" : "Ex : PP260512.1432.C12345678"} className="w-full border-2 border-slate-200 rounded-2xl px-4 py-3.5 mt-1.5 font-bold outline-none focus:border-[#F59E0B] uppercase" /></label>
                <label className="block mt-3"><span className="text-xs font-bold text-slate-500">NUMÉRO DE TÉLÉPHONE UTILISÉ POUR LE PAIEMENT *</span>
                  <input value={activationForm.telephone} onChange={(e) => setActivationForm({ ...activationForm, telephone: e.target.value })} placeholder="Ex : 07 07 12 34 56" inputMode="tel" className="w-full border-2 border-slate-200 rounded-2xl px-4 py-3.5 mt-1.5 font-bold outline-none focus:border-[#F59E0B]" /></label>

                {activationError && <p className="bg-red-50 text-red-700 border border-red-200 text-sm rounded-xl px-3.5 py-2.5 mt-3">{activationError}</p>}

                <button onClick={activerCredits} disabled={activating} className="mt-4 w-full bg-[#009A44] hover:bg-emerald-700 disabled:opacity-60 text-white font-extrabold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-200 active:scale-[.98] transition">
                  <Zap size={18} /> {activating ? "Activation en cours…" : "Activer mes crédits maintenant"}
                </button>
                <p className="text-[11px] text-slate-400 text-center mt-2.5 flex items-center justify-center gap-1"><ShieldCheck size={12} /> Déblocage immédiat ({OFFRES_PAIEMENT[activationModal.offre]?.creditsLabel}) — vérification administrateur a posteriori sur la référence transmise.</p>
              </>
            )}
          </div>
        </div>
      )}

      {toast && <Toast msg={toast} />}
    </div>
  );
}

export const NORMES_RESUME = [
  "Murs : 13 agglos 40×20 par m² — mortier : 0,25 sac de ciment + 0,025 m³ de sable par m²",
  "Enduit 2 faces : 0,25 sac de ciment + 0,03 m³ de sable par m² de mur",
  "Béton armé 350 kg/m³ : 7 sacs de ciment + 0,40 m³ de sable + 0,80 m³ de gravier par m³",
  "Acier HA : 90 kg/m³ (poteaux/poutres) et 50 kg/m³ (semelles)",
  "Carrelage : surface + 10 % de pertes, colle 1 sac de 25 kg pour 4,5 m²",
  "Main-d'œuvre et mise en œuvre : 30 % du total des matériaux (ajustable)",
];

function NormesRappel() {
  return (
    <div className="col-span-2 bg-emerald-50/70 border border-emerald-200 rounded-2xl p-3.5">
      <p className="text-xs font-extrabold text-emerald-900 flex items-center gap-1.5"><ShieldCheck size={14} /> BASE DE CONNAISSANCES MÉTIER — NORMES CI APPLIQUÉES</p>
      <ul className="mt-2 space-y-1">
        {NORMES_RESUME.map((n) => (
          <li key={n} className="text-[12px] text-emerald-950/75 flex gap-1.5"><Check size={13} className="text-[#009A44] shrink-0 mt-0.5" />{n}</li>
        ))}
      </ul>
    </div>
  );
}

function Toast({ msg }: { msg: string }) {
  return <div className="fixed bottom-24 md:bottom-6 inset-x-4 sm:inset-x-auto sm:right-6 z-[60] bg-[#0F172A] text-white font-semibold text-sm rounded-2xl px-4 py-3.5 shadow-2xl flex items-center gap-2.5 animate-fadeUp max-w-md mx-auto sm:mx-0"><CheckCircle2 className="text-emerald-400 shrink-0" size={19} /><span>{msg}</span></div>;
}

function Stepper({ label, value, onChange, min, max }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number }) {
  return (
    <div className="bg-[#F1F5F9] rounded-2xl p-3"><span className="text-[11px] font-bold text-slate-500 flex items-center gap-1"><Layers size={11} /> {label}</span>
      <div className="flex items-center justify-between bg-white border rounded-xl mt-1.5 overflow-hidden">
        <button className="px-3 py-2.5 font-extrabold text-lg" onClick={() => onChange(Math.max(min, value - 1))}>−</button>
        <span className="font-extrabold">{value}</span>
        <button className="px-3 py-2.5 font-extrabold text-lg" onClick={() => onChange(Math.min(max, value + 1))}>+</button>
      </div></div>
  );
}

function PricingCard({ titre, prix, unite, desc, features, onPayWave, onPayOM, populaire, illimite }: any) {
  return (
    <article className={`relative bg-white rounded-3xl p-5 shadow-sm border-2 ${illimite ? "border-[#009A44] shadow-emerald-100 shadow-xl" : populaire ? "border-[#F59E0B] shadow-amber-100 shadow-xl" : "border-slate-100"}`}>
      {(populaire || illimite) && <span className={`absolute -top-3 left-5 text-white text-[11px] font-extrabold px-3 py-1.5 rounded-full uppercase tracking-wide ${illimite ? "bg-[#009A44]" : "bg-[#F59E0B]"}`}>{illimite ? "Le plus complet" : "Le plus choisi"}</span>}
      <div className="flex items-start justify-between gap-3"><div><h3 className="font-extrabold text-lg">{titre}</h3><p className="text-[13px] text-slate-500">{desc}</p></div><Star className={illimite ? "text-[#009A44]" : populaire ? "text-[#F59E0B]" : "text-slate-300"} fill="currentColor" /></div>
      <p className="mt-4"><span className="font-extrabold text-[34px] leading-none tnum">{prix}</span> <span className="font-bold text-slate-500 text-sm">{unite}</span></p>
      <ul className="mt-4 space-y-2">{features.map((f: string) => <li key={f} className="flex gap-2 text-sm text-slate-600"><CheckCircle2 size={17} className="text-[#009A44] shrink-0 mt-0.5" />{f}</li>)}</ul>
      <div className="grid grid-cols-2 gap-2 mt-5">
        <button onClick={onPayWave} className="bg-[#1DC4F2] hover:bg-[#0AA9E0] text-white font-extrabold py-3.5 rounded-2xl flex items-center justify-center gap-1.5 text-[14px] shadow-lg shadow-sky-200 active:scale-[.98] transition">
          <Wallet size={16} /> Payer avec Wave
        </button>
        <button onClick={onPayOM} className="bg-[#FF7900] hover:bg-[#E56A00] text-white font-extrabold py-3.5 rounded-2xl flex items-center justify-center gap-1.5 text-[14px] shadow-lg shadow-orange-200 active:scale-[.98] transition">
          <Wallet size={16} /> Payer avec Orange Money
        </button>
      </div>
      <p className="text-center text-[11px] font-bold text-slate-400 mt-2.5">Déblocage immédiat avec l'ID de transaction SMS — contrôle administrateur a posteriori</p>
    </article>
  );
}

function DevisCard({ d, onOpen, onPdf, onWa, onAchats, onAcompte, onAvenant }: { d: Devis; onOpen: () => void; onPdf: () => void; onWa: () => void; onAchats: () => void; onAcompte: () => void; onAvenant: () => void }) {
  const st = STATUT[d.statut] || STATUT.brouillon;
  return (
    <article className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
      <button onClick={onOpen} className="w-full text-left">
        <div className="flex items-start gap-3">
          <span className="bg-[#0F172A] text-white w-11 h-11 rounded-2xl grid place-items-center shrink-0"><Building2 size={20} /></span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap"><b className="truncate">{d.clientNom}</b><span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${st.cls}`}><span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />{st.label}</span></div>
            <p className="text-xs text-slate-500 truncate mt-0.5">{d.numero} • <MapPin className="inline" size={11} /> {d.lieu} • {dateFr(d.createdAt)}</p>
            <p className="text-[13px] text-slate-600 truncate mt-1">{d.natureTravaux}</p>
            {d.montantMainOeuvre > 0 && <p className="text-[11px] text-slate-400 mt-1">Matériaux {fcfa(d.totalMateriaux || 0)} • Main-d'œuvre {d.mainOeuvrePct ?? 30} % : {fcfa(d.montantMainOeuvre)}</p>}
            {d.materiauxClient && <span className="inline-flex mt-1.5 text-[10px] font-extrabold bg-teal-600 text-white px-2 py-0.5 rounded-full">MAIN-D'ŒUVRE SEULE — à payer : {fcfa(d.totalMoSeuleTTC || 0)}</span>}
            {d.statut === "signe" && d.margeNetteRestante !== null && d.margeNetteRestante !== undefined && <p className={`text-[11px] font-bold mt-1 ${d.margeNetteRestante >= 0 ? "text-emerald-600" : "text-red-600"}`}>Dépenses : {fcfa(d.totalDepenses || 0)} • Marge nette restante : {fcfa(d.margeNetteRestante)}</p>}
          </div>
          <div className="text-right shrink-0"><p className="font-extrabold text-[#0F172A]">{fcfa(d.totalTTC)}</p><p className="text-[11px] text-slate-400">TTC</p></div>
        </div>
      </button>
      <div className="grid grid-cols-3 gap-2 mt-3">
        <button onClick={onOpen} className="bg-slate-900 text-white text-[13px] font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5"><Eye size={14} /> Ouvrir</button>
        <button onClick={onPdf} className="bg-orange-50 border border-orange-200 text-[#B45309] text-[13px] font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5"><Download size={14} /> PDF</button>
        <button onClick={onWa} className="bg-[#25D366]/10 border border-[#25D366]/40 text-[#128C4B] text-[13px] font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5"><MessageCircle size={14} /> WhatsApp</button>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-2">
        <button onClick={onAchats} className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-[13px] font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5"><ShoppingCart size={14} /> Achats</button>
        <button onClick={onAcompte} className="bg-slate-50 border border-slate-200 text-slate-700 text-[13px] font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5"><Receipt size={14} /> Acompte</button>
        <button onClick={onAvenant} className="bg-violet-50 border border-violet-200 text-violet-800 text-[13px] font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5"><FilePlus2 size={14} /> Avenant</button>
      </div>
      {(d.signedAt || d.signatureClientNom) && <p className="text-[11px] text-emerald-700 font-semibold mt-2 flex items-center gap-1"><CheckCircle2 size={12} /> Signé électroniquement par {d.signatureClientNom} le {dateFr(d.signedAt)}</p>}
    </article>
  );
}

function ImageUploadField({ label, hint, icon: Icon, data, nom, onFile, onRemove }: { label: string; hint: string; icon: any; data: string; nom: string; onFile: (f: File) => void; onRemove: () => void }) {
  const id = `up-${label.replace(/[^a-z]/gi, "")}`;
  return (
    <div className="border-2 border-dashed border-slate-200 rounded-2xl p-3.5 bg-white">
      <p className="text-xs font-extrabold text-slate-600 flex items-center gap-1.5"><Icon size={14} className="text-[#F59E0B]" /> {label}</p>
      {data ? (
        <div className="mt-2.5">
          <div className="bg-[repeating-conic-gradient(#f1f1ee_0%_25%,#fff_0%_50%)] bg-[length:14px_14px] border rounded-xl h-28 grid place-items-center overflow-hidden">
            <img src={data} alt={label} className="max-h-28 max-w-full object-contain" />
          </div>
          <p className="text-[11px] text-slate-400 truncate mt-1.5">{nom || "Image enregistrée"}</p>
          <div className="flex gap-2 mt-2">
            <label htmlFor={id} className="flex-1 bg-slate-900 text-white text-xs font-bold py-2 rounded-lg text-center cursor-pointer">Remplacer</label>
            <button onClick={onRemove} className="flex-1 bg-red-50 text-red-600 border border-red-200 text-xs font-bold py-2 rounded-lg">Retirer</button>
          </div>
        </div>
      ) : (
        <label htmlFor={id} className="mt-2.5 block text-center cursor-pointer bg-[#F1F5F9] hover:bg-orange-50 border border-slate-200 rounded-xl py-5 transition">
          <ImagePlus className="mx-auto text-[#D97706]" size={22} />
          <span className="block font-bold text-[13px] mt-1.5">Ajouter une image</span>
          <span className="block text-[11px] text-slate-400 px-3 mt-0.5">{hint}</span>
        </label>
      )}
      <input id={id} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
    </div>
  );
}
