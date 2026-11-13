"use client";

/**
 * Moteur PDF DevisBTP CI — mise en page infographique professionnelle.
 * Formats : A4 (210×297 mm) et A3 (297×420 mm), choisis par l'utilisateur.
 * jsPDF est importé dynamiquement pour ne jamais alourdir le premier chargement.
 */

export type FormatPapier = "A4" | "A3";

export function formatPapierInfo(f: FormatPapier) {
  return f === "A3" ? { format: "a3", W: 297, H: 420 } : { format: "a4", W: 210, H: 297 };
}

const clean = (s: string) => (s || "").replace(/œ/g, "oe").replace(/Œ/g, "OE").replace(/’/g, "'").replace(/‘/g, "'").replace(/“|”/g, '"').replace(/✓/g, "OK").replace(/[\u{1F300}-\u{1FAFF}]/gu, "");
const money = (n: number) => new Intl.NumberFormat("fr-FR").format(Math.round(n));
const fmtN = (n: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n);

export type PdfEntreprise = {
  nom?: string; proprietaire?: string; telephone?: string; email?: string;
  adresse?: string; ville?: string; rccm?: string; compteContribuable?: string;
  logoData?: string; signatureData?: string; cachetData?: string;
};

function addImg(doc: any, data: string, x: number, y: number, w: number, h: number) {
  if (!data) return;
  try { doc.addImage(data, data.includes("image/png") ? "PNG" : "JPEG", x, y, w, h); } catch { /* ignore */ }
}

/** En-tête marque pleine largeur, logo, mentions légales, numéro de document. */
function entete(doc: any, ent: PdfEntreprise | null | undefined, titreDoc: string, numero: string, dateDoc: string, lieu: string, W: number) {
  const M = 14; // marge
  doc.setFillColor(15, 23, 42); doc.rect(0, 0, W, 34, "F");
  doc.setFillColor(245, 158, 11); doc.rect(0, 34, W, 2.5, "F");
  const logoOk = !!ent?.logoData;
  if (logoOk) addImg(doc, ent!.logoData!, M, 7, 20, 20);
  const tx = logoOk ? M + 25 : M;
  doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(17);
  doc.text(clean(ent?.nom || "DevisBTP CI"), tx, 13);
  doc.setFontSize(7.8); doc.setFont("helvetica", "normal"); doc.setTextColor(203, 213, 225);
  const adr = clean([ent?.adresse || ent?.ville || "Abidjan", ent?.telephone, ent?.email].filter(Boolean).join("  •  "));
  doc.text(adr, tx, 19.5, { maxWidth: W * 0.5 });
  const legal = [ent?.rccm ? `RCCM : ${ent.rccm}` : "", ent?.compteContribuable ? `CC : ${ent.compteContribuable}` : ""].filter(Boolean).join("   •   ");
  if (legal) doc.text(clean(legal), tx, 25);
  doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(148, 163, 184);
  doc.text(clean(titreDoc), tx, 30);
  doc.setTextColor(255, 255, 255); doc.setFontSize(14); doc.setFont("helvetica", "bold");
  doc.text(clean(numero), W - M, 14, { align: "right" });
  doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(203, 213, 225);
  doc.text(`Date : ${dateDoc}`, W - M, 20, { align: "right" });
  doc.text(clean(`Chantier : ${lieu}`), W - M, 26, { align: "right", maxWidth: W * 0.4 });
}

/** Bloc client + chantier. */
function blocClient(doc: any, M: number, W: number, y: number, d: any) {
  doc.setFillColor(248, 250, 252); doc.roundedRect(M, y, W - 2 * M, 22, 2.5, 2.5, "F");
  doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.4); doc.roundedRect(M, y, W - 2 * M, 22, 2.5, 2.5);
  doc.setTextColor(100, 116, 139); doc.setFontSize(7.5); doc.setFont("helvetica", "bold");
  doc.text("CLIENT", M + 4, y + 6);
  doc.setTextColor(15, 23, 42); doc.setFontSize(11.5); doc.setFont("helvetica", "bold");
  doc.text(clean(d.clientNom), M + 4, y + 12.5);
  doc.setFont("helvetica", "normal"); doc.setFontSize(7.8); doc.setTextColor(100, 116, 139);
  doc.text(clean(`${d.clientTel || "—"}  •  Chantier : ${d.lieu}`), M + 4, y + 18.5);
  doc.setFontSize(8); doc.setTextColor(51, 65, 85);
  doc.text(clean(`Travaux : ${d.natureTravaux}`), W - M - 4, y + 10.5, { align: "right", maxWidth: W * 0.45 });
  doc.setFontSize(7.5); doc.setTextColor(100, 116, 139);
  doc.text(clean(`${d.surface || ""} m² au sol • ${d.nbPieces || ""} pièces • ${d.nbEtages || 1} niveau(x)`), W - M - 4, y + 18, { align: "right" });
  return y + 27;
}

/** Bloc totaux récapitulatif (matériaux / main-d'œuvre / HT / TVA / TTC). */
function blocTotaux(doc: any, M: number, W: number, y: number, lignes: { label: string; value: string; hot?: boolean; neg?: boolean }[], titre: string) {
  const h = 7 + lignes.length * 6.5 + 6;
  const bx = W * 0.52;
  const bw = W - M - bx;
  doc.setFillColor(15, 23, 42); doc.roundedRect(bx, y, bw, h, 3, 3, "F");
  doc.setTextColor(245, 158, 11); doc.setFontSize(8); doc.setFont("helvetica", "bold");
  doc.text(clean(titre.toUpperCase()), bx + 5, y + 6);
  let yy = y + 12;
  for (const l of lignes) {
    doc.setFont("helvetica", l.hot ? "bold" : "normal");
    doc.setTextColor(l.hot ? 251 : 226, l.hot ? 191 : 232, l.hot ? 36 : 240);
    doc.setFontSize(l.hot ? 10 : 8.5);
    doc.text(clean(l.label), bx + 5, yy);
    doc.text(clean(l.value), bx + bw - 5, yy, { align: "right" });
    yy += 6.5;
  }
  return y + h;
}

/** Pied de page légal + signature/cachet. */
function piedPage(doc: any, ent: PdfEntreprise | null | undefined, y: number, W: number, H: number, pagesTotal: number, clauseTexte?: string) {
  const M = 14;
  if (clauseTexte && y < H - 70) {
    doc.setFillColor(255, 248, 235); doc.setDrawColor(252, 211, 77); doc.setLineWidth(0.4);
    const lignesClause = doc.splitTextToSize(clean(clauseTexte), W - 2 * M - 8);
    const hh = 10 + lignesClause.length * 4;
    doc.roundedRect(M, y, W - 2 * M, hh, 2.5, 2.5, "F");
    doc.setTextColor(146, 64, 14); doc.setFontSize(7.6); doc.setFont("helvetica", "bold");
    doc.text("CONDITIONS DE VALIDITÉ", M + 4, y + 6);
    doc.setFont("helvetica", "normal"); doc.setTextColor(120, 53, 15); doc.setFontSize(7);
    doc.text(lignesClause, M + 4, y + 10.5);
    y += hh + 6;
  }
  // zone signature
  doc.setTextColor(51, 65, 85); doc.setFontSize(8); doc.setFont("helvetica", "bold");
  doc.text("Le client (bon pour accord)", M, y + 2);
  doc.text(clean(`Pour ${ent?.nom || ""} — ${ent?.proprietaire || ""}`, ), W - M, y + 2, { align: "right" });
  if (ent?.signatureData) addImg(doc, ent.signatureData, W - 78, y + 5, 52, 13);
  if (ent?.cachetData) addImg(doc, ent.cachetData, W - 46, y + 1, 30, 30);
  doc.setDrawColor(148, 163, 184); doc.setLineWidth(0.5);
  doc.line(M, y + 21, M + 62, y + 21); doc.line(W - M - 62, y + 21, W - M, y + 21);
  // pieds de page sur chaque page
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.3); doc.line(M, H - 16, W - M, H - 16);
    doc.setFontSize(6.8); doc.setTextColor(148, 163, 184); doc.setFont("helvetica", "normal");
    const legal = [ent?.nom || "", ent?.rccm ? `RCCM ${ent.rccm}` : "", ent?.compteContribuable ? `CC ${ent.compteContribuable}` : "", ent?.adresse || ent?.ville || ""].filter(Boolean).join("  •  ");
    if (legal) doc.text(clean(legal), W / 2, H - 11, { align: "center", maxWidth: W - 2 * M });
    doc.setTextColor(120, 128, 122);
    doc.text(`Document généré avec DevisBTP CI  •  Page ${i}/${pages}`, W / 2, H - 6.5, { align: "center" });
  }
}

type LignePdf = { section?: string; designation: string; detail?: string | null; unite: string; quantite: number; prixUnitaire: number };

/** Tableau de lignes détaillé (format DQE complet) avec en-têtes de section colorés. */
function tableauDetaille(doc: any, M: number, W: number, y: number, H: number, groups: [string, LignePdf[]][], fontSize: number) {
  const col = { desc: M, unite: W * 0.60, qte: W * 0.68, pu: W * 0.78, total: W - M };
  const maxY = H - 46;
  groups.forEach(([section, ls]) => {
    if (y > maxY - 14) { doc.addPage(); y = 20; }
    const sous = ls.reduce((s, l) => s + l.quantite * l.prixUnitaire, 0);
    doc.setFillColor(15, 23, 42); doc.rect(M, y, W - 2 * M, 7.5, "F");
    doc.setFillColor(245, 158, 11); doc.rect(M, y, 3, 7.5, "F");
    doc.setTextColor(255, 255, 255); doc.setFontSize(8.2); doc.setFont("helvetica", "bold");
    doc.text(clean(section.toUpperCase()), M + 5.5, y + 5.2);
    doc.text(`${money(sous)} FCFA`, W - M - 4, y + 5.2, { align: "right" });
    y += 10;
    doc.setTextColor(100, 116, 139); doc.setFontSize(6.6); doc.setFont("helvetica", "bold");
    doc.text("DÉSIGNATION", col.desc, y); doc.text("UNITÉ", col.unite, y); doc.text("QTÉ", col.qte, y); doc.text("P.U. FCFA", col.pu, y); doc.text("TOTAL", col.total, y, { align: "right" });
    y += 1.5; doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.3); doc.line(M, y, W - M, y); y += 4.5;
    ls.forEach((l) => {
      if (y > maxY - 8) { doc.addPage(); y = 20; }
      const wrapped = doc.splitTextToSize(clean(l.designation + (l.detail ? ` — ${l.detail}` : "")), col.unite - col.desc - 6);
      doc.setTextColor(30, 41, 59); doc.setFontSize(fontSize); doc.setFont("helvetica", "normal");
      doc.text(wrapped, col.desc, y);
      doc.setTextColor(71, 85, 105);
      doc.text(clean(l.unite), col.unite, y); doc.text(fmtN(l.quantite), col.qte, y);
      doc.text(money(l.prixUnitaire), col.pu, y);
      doc.setFont("helvetica", "bold"); doc.setTextColor(15, 23, 42);
      doc.text(money(l.quantite * l.prixUnitaire), col.total, y, { align: "right" });
      y += Math.max(5, wrapped.length * (fontSize + 1.2)) + 1;
    });
    y += 3;
  });
  return y;
}

/** Tableau résumé par lots (Option A). */
function tableauLots(doc: any, M: number, W: number, y: number, H: number, lots: { nom: string; montant: number }[], total: number, fontSize: number) {
  const maxY = H - 60;
  doc.setTextColor(15, 23, 42); doc.setFontSize(fontSize + 2.5); doc.setFont("helvetica", "bold");
  doc.text("RÉSUMÉ PAR GRANDES ÉTAPES", M, y); y += 4;
  doc.setDrawColor(245, 158, 11); doc.setLineWidth(0.9); doc.line(M, y, W - M, y); y += 8;
  lots.forEach((r, i) => {
    if (y > maxY - 10) { doc.addPage(); y = 20; }
    doc.setFillColor(i % 2 ? 248 : 255, i % 2 ? 250 : 255, i % 2 ? 252 : 255);
    doc.rect(M, y - 4.5, W - 2 * M, 11, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(fontSize + 1); doc.setTextColor(30, 41, 59);
    doc.text(`${i + 1}. ${clean(r.nom)}`, M + 3, y + 1.5);
    doc.setFont("helvetica", "normal"); doc.setFontSize(fontSize - 1); doc.setTextColor(100, 116, 139);
    doc.text(`${Math.round((r.montant / (total || 1)) * 100)} % du total`, M + 3, y + 5.5);
    const bw = 46;
    doc.setFillColor(241, 245, 249); doc.roundedRect(W * 0.52, y + 1.5, bw, 2.2, 1, 1, "F");
    doc.setFillColor(245, 158, 11); doc.roundedRect(W * 0.52, y + 1.5, Math.max(3, bw * (r.montant / (total || 1))), 2.2, 1, 1, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(fontSize + 1); doc.setTextColor(15, 23, 42);
    doc.text(`${money(r.montant)} FCFA`, W - M, y + 2.5, { align: "right" });
    y += 12.5;
  });
  doc.setFontSize(fontSize - 1.5); doc.setFont("helvetica", "normal"); doc.setTextColor(100, 116, 139);
  doc.text(clean("Version simplifiée : le détail technique (quantités, ratios) est conservé par l'entreprise et disponible sur demande."), M, y + 3, { maxWidth: W - 2 * M });
  return y + 10;
}

/** Tableau par catégories de matériaux (Option B). */
function tableauCategories(doc: any, M: number, W: number, y: number, H: number, cats: { nom: string; quantite?: number; unite?: string; montant: number }[], fontSize: number) {
  const maxY = H - 60;
  doc.setTextColor(15, 23, 42); doc.setFontSize(fontSize + 2.5); doc.setFont("helvetica", "bold");
  doc.text("DEVIS PAR CATÉGORIES DE MATÉRIAUX", M, y); y += 4;
  doc.setDrawColor(245, 158, 11); doc.setLineWidth(0.9); doc.line(M, y, W - M, y); y += 7;
  doc.setTextColor(100, 116, 139); doc.setFontSize(6.6); doc.setFont("helvetica", "bold");
  doc.text("CATÉGORIE", M, y); doc.text("QUANTITÉ TOTALE", W * 0.58, y); doc.text("MONTANT", W - M, y, { align: "right" });
  y += 1.5; doc.setDrawColor(226, 232, 240); doc.line(M, y, W - M, y); y += 6;
  cats.forEach((r) => {
    if (y > maxY - 8) { doc.addPage(); y = 20; }
    doc.setFont("helvetica", "bold"); doc.setFontSize(fontSize + 0.5); doc.setTextColor(30, 41, 59);
    doc.text(clean(r.nom), M, y);
    doc.setFont("helvetica", "normal"); doc.setTextColor(100, 116, 139); doc.setFontSize(fontSize - 0.5);
    doc.text(r.quantite ? `${fmtN(r.quantite)} ${clean(r.unite || "")}` : "—", W * 0.58, y);
    doc.setFont("helvetica", "bold"); doc.setTextColor(15, 23, 42); doc.setFontSize(fontSize + 0.5);
    doc.text(`${money(r.montant)} FCFA`, W - M, y, { align: "right" });
    y += 7.5;
  });
  doc.setFontSize(fontSize - 1.5); doc.setTextColor(100, 116, 139);
  doc.text(clean("Totaux par catégorie, sans détail des calculs internes."), M, y + 2, { maxWidth: W - 2 * M });
  return y + 8;
}

/** Liste de matériaux à fournir (mode main-d'œuvre seule) : quantités sans prix. */
function tableauMateriauxClient(doc: any, M: number, W: number, y: number, H: number, achats: { designation: string; quantite: number; unite: string }[], fontSize: number) {
  const maxY = H - 80;
  doc.setTextColor(13, 122, 89); doc.setFontSize(fontSize + 2.5); doc.setFont("helvetica", "bold");
  doc.text("MATÉRIAUX À FOURNIR PAR LE CLIENT (QUANTITÉS, SANS PRIX)", M, y); y += 5;
  doc.setFontSize(fontSize - 1); doc.setFont("helvetica", "normal"); doc.setTextColor(100, 116, 139);
  doc.text(clean("Le client fournit les matériaux ci-dessous ; l'entreprise ne facture que la main-d'œuvre et la mise en œuvre."), M, y, { maxWidth: W - 2 * M });
  y += 8;
  doc.setTextColor(100, 116, 139); doc.setFontSize(6.6); doc.setFont("helvetica", "bold");
  doc.text("MATÉRIAU", M, y); doc.text("QUANTITÉ À PRÉVOIR", W - M, y, { align: "right" });
  y += 1.5; doc.setDrawColor(226, 232, 240); doc.line(M, y, W - M, y); y += 6;
  achats.forEach((a) => {
    if (y > maxY - 6) { doc.addPage(); y = 20; }
    doc.setFont("helvetica", "normal"); doc.setFontSize(fontSize); doc.setTextColor(30, 41, 59);
    doc.text(clean(a.designation), M, y, { maxWidth: W * 0.62 });
    doc.setFont("helvetica", "bold");
    doc.text(`${fmtN(a.quantite)} ${clean(a.unite)}`, W - M, y, { align: "right" });
    y += 6.5;
  });
  return y + 6;
}

/** Planning estimatif avec barres de Gantt simplifiées. */
function blocPlanning(doc: any, M: number, W: number, y: number, H: number, planning: any[], fontSize: number) {
  if (!planning?.length) return y;
  const maxY = H - 60;
  if (y > maxY - 30) { doc.addPage(); y = 20; }
  const total = planning.reduce((s, e) => s + (Number(e.dureeJours) || 0), 0);
  doc.setFillColor(15, 23, 42); doc.rect(M, y, W - 2 * M, 8, "F");
  doc.setTextColor(255, 255, 255); doc.setFontSize(8.5); doc.setFont("helvetica", "bold");
  doc.text("PLANNING ESTIMATIF DES TRAVAUX (IA)", M + 4, y + 5.6);
  doc.text(`${total} jours ouvrés (~${Math.ceil(total / 5)} sem.)`, W - M - 4, y + 5.6, { align: "right" });
  y += 12;
  const gx = M + W * 0.62, gw = W - M - gx;
  let cumul = 0;
  planning.forEach((e, i) => {
    if (y > maxY - 8) { doc.addPage(); y = 20; }
    cumul += Number(e.dureeJours) || 0;
    doc.setFont("helvetica", "bold"); doc.setFontSize(fontSize); doc.setTextColor(30, 41, 59);
    doc.text(`${i + 1}. ${clean(e.etape)}`, M, y);
    doc.setFont("helvetica", "normal"); doc.setFontSize(fontSize - 1); doc.setTextColor(100, 116, 139);
    if (e.detail) doc.text(clean(e.detail), M, y + 3.8, { maxWidth: W * 0.55 });
    // barre Gantt
    const decal = ((cumul - (Number(e.dureeJours) || 0)) / (total || 1)) * gw;
    const largeur = ((Number(e.dureeJours) || 0) / (total || 1)) * gw;
    doc.setFillColor(i % 2 ? 245 : 251, i % 2 ? 158 : 245, i % 2 ? 11 : 158);
    doc.setFillColor(245, 158, 11);
    doc.roundedRect(gx + decal, y - 2.2, Math.max(2, largeur), 4, 1.2, 1.2, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(fontSize - 0.5); doc.setTextColor(51, 65, 85);
    doc.text(`${e.dureeJours} j`, W - M, y, { align: "right" });
    y += 9.5;
  });
  doc.setFontSize(fontSize - 1.5); doc.setTextColor(100, 116, 139);
  doc.text(clean("Planning indicatif hors aléas météo et délais d'approvisionnement."), M, y + 1, { maxWidth: W - 2 * M });
  return y + 8;
}

// ======================= EXPORT PRINCIPAL =======================

export interface PdfDevisInput {
  format: FormatPapier;
  entreprise: PdfEntreprise | null | undefined;
  devis: any;
  lignes: LignePdf[];
  planning?: any[];
  tot: { materiaux: number; mo: number; htBrut: number; remise: number; ht: number; tva: number; ttc: number; tvaPct: number; remisePct: number; moLabel: string; moSeule?: boolean; moSeuleTTC?: number };
  resume?: { lots: { nom: string; montant: number }[]; categories: { nom: string; quantite?: number; unite?: string; montant: number }[] };
  achatsClient?: { designation: string; quantite: number; unite: string }[];
  clause?: string;
  titreDoc?: string;
  nomFichier: string;
  statutSigne?: { data?: string; nom?: string; date?: any };
  /** true : renvoie une URL blob (aperçu + impression) au lieu de télécharger. */
  apercu?: boolean;
}

export async function genererPdfDevis(input: PdfDevisInput): Promise<string> {
  const { default: jsPDF } = await import("jspdf");
  const { format, W, H } = formatPapierInfo(input.format);
  const M = 14;
  const fontSize = input.format === "A3" ? 9.5 : 7.8;
  const doc = new jsPDF({ unit: "mm", format });
  const d = input.devis;
  const dateDoc = new Date(d.createdAt || Date.now()).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });

  entete(doc, input.entreprise, input.titreDoc || "DEVIS QUANTITATIF ESTIMATIF (DQE)", d.numero, dateDoc, d.lieu, W);
  let y = 42;
  y = blocClient(doc, M, W, y, d);

  const modeMoSeule = !!d.materiauxClient;
  const formatPdf = d.formatPdf || "general";

  if (modeMoSeule && input.achatsClient?.length) {
    y = tableauMateriauxClient(doc, M, W, y, H, input.achatsClient, fontSize);
  } else if (formatPdf === "general" && input.resume?.lots?.length) {
    y = tableauLots(doc, M, W, y, H, input.resume.lots, input.tot.htBrut, fontSize);
  } else if (formatPdf === "materiaux" && input.resume?.categories?.length) {
    y = tableauCategories(doc, M, W, y, H, input.resume.categories, fontSize);
  } else {
    const groups = new Map<string, any[]>();
    input.lignes.forEach((l) => { const s = l.section || "Divers"; if (!groups.has(s)) groups.set(s, []); groups.get(s)!.push(l); });
    y = tableauDetaille(doc, M, W, y, H, Array.from(groups.entries()), fontSize);
  }

  y = blocPlanning(doc, M, W, y, H, input.planning || [], fontSize);

  if (y > H - 90) { doc.addPage(); y = 24; }
  const t = input.tot;
  const lignesTotaux: { label: string; value: string; hot?: boolean }[] = modeMoSeule
    ? [
        { label: "MAIN-D'ŒUVRE SEULE À PAYER", value: "" },
        { label: "Main-d'œuvre HT", value: `${money(Math.round(t.moSeuleTTC || t.mo / 1.18))} FCFA` },
        { label: `TVA ${t.tvaPct} %`, value: `${money(Math.round((t.moSeuleTTC || t.mo / 1.18) * t.tvaPct / 100))} FCFA` },
        { label: "TOTAL À PAYER (MO) TTC", value: `${money(Math.round(t.moSeuleTTC || t.mo))} FCFA`, hot: true },
      ]
    : formatPdf === "general"
      ? [{ label: "Montant global des travaux HT", value: `${money(t.htBrut)} FCFA` }, ...(t.remise > 0 ? [{ label: `Remise ${t.remisePct} %`, value: `− ${money(t.remise)} FCFA` }] : []), { label: `TVA ${t.tvaPct} %`, value: `${money(t.tva)} FCFA` }, { label: "TOTAL TTC", value: `${money(t.ttc)} FCFA`, hot: true }]
      : [
          { label: "Total matériaux & fournitures", value: `${money(t.materiaux)} FCFA` },
          { label: `Main-d'œuvre (${t.moLabel})`, value: `${money(t.mo)} FCFA` },
          { label: "Total HT", value: `${money(t.htBrut)} FCFA` },
          ...(t.remise > 0 ? [{ label: `Remise ${t.remisePct} %`, value: `− ${money(t.remise)} FCFA` }] : []),
          { label: `TVA ${t.tvaPct} %`, value: `${money(t.tva)} FCFA` },
          { label: "TOTAL TTC", value: `${money(t.ttc)} FCFA`, hot: true },
        ];
  // Note informative à gauche des totaux
  const noteX = M, noteW = W * 0.5 - M;
  doc.setTextColor(100, 116, 139); doc.setFontSize(7); doc.setFont("helvetica", "normal");
  const notes = [
    `Validité de l'offre : ${d.validiteJours || 30} jours.`,
    "Paiement : acompte 40 % au démarrage, 40 % à mi-chantier, 20 % à la réception.",
    modeMoSeule ? `Valeur totale des travaux si l'entreprise fournissait les matériaux : ${money(t.ttc)} FCFA (indicatif).` : "Arrêté le présent devis à la somme TTC ci-contre.",
    d.formatPdf === "detaille" ? "Quantités selon normes CI : 13 agglos 40×20/m² ; mortier 0,25 sac + 0,025 m³ sable/m² ; enduit 0,25 sac + 0,03 m³/m² ; béton 350 kg/m³ = 7 sacs + 0,40 m³ sable + 0,80 m³ gravier/m³ ; acier 90 kg/m³ (poteaux/poutres), 50 kg/m³ (semelles) ; carrelage +10 % de pertes, colle 1 sac/4,5 m²." : d.formatPdf === "materiaux" ? "Totaux par catégories, sans détail des calculs." : "Version simplifiée par lots : détail technique disponible sur demande.",
  ];
  let ny = y + 4;
  notes.forEach((n) => { doc.text(clean(n), noteX, ny, { maxWidth: noteW }); ny += 4.2; });
  blocTotaux(doc, M, W, y, lignesTotaux, modeMoSeule ? "À payer à l'entrepreneur" : "Récapitulatif");

  piedPage(doc, input.entreprise, Math.max(y + 46, H - 62), W, H, 1, input.clause);
  if (input.apercu) return doc.output("bloburl") as unknown as string;
  doc.save(input.nomFichier);
  return input.nomFichier;
}

// ======================= FACTURE & AVENANT =======================

export async function genererPdfFacture(input: {
  format: FormatPapier; entreprise: PdfEntreprise | null | undefined;
  facture: any; devis: any; nomFichier: string;
}): Promise<string> {
  const { default: jsPDF } = await import("jspdf");
  const { format, W, H } = formatPapierInfo(input.format);
  const M = 14; const fontSize = input.format === "A3" ? 9.5 : 7.8;
  const doc = new jsPDF({ unit: "mm", format });
  const { facture: f, devis: d } = input;
  const dateDoc = new Date(f.createdAt || Date.now()).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  entete(doc, input.entreprise, "FACTURE D'ACOMPTE", f.numero, dateDoc, d.lieu, W);
  let y = 44;
  y = blocClient(doc, M, W, y, d);
  doc.setFillColor(245, 158, 11); doc.roundedRect(M, y, W - 2 * M, 15, 3, 3, "F");
  doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(13);
  doc.text(clean(`Acompte de ${f.pct} % — à payer : ${money(f.montant)} FCFA`), W / 2, y + 9.5, { align: "center" });
  y += 22;
  const lignes = [
    { label: "Total du devis (TTC)", value: `${money(f.totalDevisTTC)} FCFA` },
    { label: `Acompte demandé (${f.pct} %)`, value: `${money(f.montant)} FCFA` },
    { label: "Déjà facturé (acomptes précédents inclus)", value: `${money(f.dejaFacture)} FCFA` },
    { label: "Solde restant après cet acompte", value: `${money(f.soldeRestant)} FCFA`, hot: true },
  ];
  y = blocTotaux(doc, M, W, y, lignes, "Détail de l'acompte");
  doc.setTextColor(100, 116, 139); doc.setFontSize(7.2);
  doc.text(clean("Paiement par Wave / Orange Money ou virement. Cette facture d'acompte vient en déduction du montant total du devis."), M, y + 5, { maxWidth: W * 0.48 });
  piedPage(doc, input.entreprise, Math.max(y + 20, H - 62), W, H, 1);
  doc.save(input.nomFichier);
  return input.nomFichier;
}

export async function genererPdfAvenant(input: {
  format: FormatPapier; entreprise: PdfEntreprise | null | undefined;
  avenant: any; devis: any; lignes: LignePdf[]; nomFichier: string;
  signesAvant?: number;
}): Promise<string> {
  const { default: jsPDF } = await import("jspdf");
  const { format, W, H } = formatPapierInfo(input.format);
  const M = 14; const fontSize = input.format === "A3" ? 9.5 : 7.8;
  const doc = new jsPDF({ unit: "mm", format });
  const { avenant: a, devis: d } = input;
  const dateDoc = new Date(a.createdAt || Date.now()).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  entete(doc, input.entreprise, `AVENANT AU DEVIS ${d.numero}`, a.numero || "AVENANT", dateDoc, d.lieu, W);
  let y = 42;
  doc.setFillColor(245, 158, 11); doc.roundedRect(M, y, W - 2 * M, 13, 3, 3, "F");
  doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(11.5);
  doc.text(clean(a.titre || "Travaux supplémentaires"), W / 2, y + 8.5, { align: "center" });
  y += 18;
  doc.setFillColor(248, 250, 252); doc.setDrawColor(226, 232, 240); doc.roundedRect(M, y, W - 2 * M, 24, 2.5, 2.5, "FD");
  doc.setTextColor(100, 116, 139); doc.setFontSize(7.5); doc.setFont("helvetica", "bold");
  doc.text("RATTACHEMENT AU DEVIS D'ORIGINE", M + 4, y + 6);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(51, 65, 85);
  doc.text(clean(`Devis d'origine : ${d.numero} du ${new Date(d.createdAt || Date.now()).toLocaleDateString("fr-FR")} — ${money(d.totalTTC)} TTC`), M + 4, y + 12);
  doc.text(clean(`Client : ${d.clientNom} ${d.clientTel || ""} — Chantier : ${d.lieu}`), M + 4, y + 17.5);
  if (a.description) doc.text(clean(`Motif : ${a.description}`), M + 4, y + 22.5, { maxWidth: W - 2 * M - 8 });
  y += 30;
  // lignes
  doc.setTextColor(100, 116, 139); doc.setFontSize(6.6); doc.setFont("helvetica", "bold");
  doc.text("DÉSIGNATION", M, y); doc.text("UNITÉ", W * 0.6, y); doc.text("QTÉ", W * 0.68, y); doc.text("P.U. FCFA", W * 0.78, y); doc.text("TOTAL", W - M, y, { align: "right" });
  y += 1.5; doc.setDrawColor(245, 158, 11); doc.setLineWidth(0.8); doc.line(M, y, W - M, y); y += 6;
  const maxY = H - 90;
  input.lignes.forEach((l) => {
    if (y > maxY - 8) { doc.addPage(); y = 20; }
    const wrapped = doc.splitTextToSize(clean(l.designation + (l.detail ? ` — ${l.detail}` : "")), W * 0.55);
    doc.setFont("helvetica", "normal"); doc.setFontSize(fontSize); doc.setTextColor(30, 41, 59);
    doc.text(wrapped, M, y);
    doc.setTextColor(71, 85, 105); doc.text(clean(l.unite), W * 0.6, y); doc.text(fmtN(l.quantite), W * 0.68, y); doc.text(money(l.prixUnitaire), W * 0.78, y);
    doc.setFont("helvetica", "bold"); doc.setTextColor(15, 23, 42); doc.text(money(l.quantite * l.prixUnitaire), W - M, y, { align: "right" });
    y += Math.max(5, wrapped.length * (fontSize + 1.2)) + 1;
  });
  const htA = input.lignes.reduce((s, l) => s + l.quantite * l.prixUnitaire, 0);
  const tvaA = htA * (d.tvaPct ?? 18) / 100;
  y += 4;
  blocTotaux(doc, M, W, y, [
    { label: "Total avenant HT", value: `${money(htA)} FCFA` },
    { label: `TVA ${d.tvaPct ?? 18} %`, value: `${money(tvaA)} FCFA` },
    { label: "TOTAL AVENANT TTC", value: `${money(htA + tvaA)} FCFA`, hot: true },
    { label: "Nouveau total chantier", value: `${money((d.totalTTC || 0) + (input.signesAvant || 0) + htA + tvaA)} FCFA` },
  ], "Avenant");
  doc.setTextColor(100, 116, 139); doc.setFontSize(7.2);
  doc.text(clean("Le présent avenant fait partie intégrante du devis d'origine. Les travaux supplémentaires démarrent après accord écrit du client."), M, y + 40, { maxWidth: W * 0.48 });
  piedPage(doc, input.entreprise, Math.max(y + 46, H - 62), W, H, 1);
  doc.save(input.nomFichier);
  return input.nomFichier;
}


