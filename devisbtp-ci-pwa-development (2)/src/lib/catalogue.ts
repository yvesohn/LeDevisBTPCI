export type LigneGen = {
  section: string;
  designation: string;
  detail: string;
  unite: string;
  quantite: number;
  prixUnitaire: number;
};

/** Désignation exacte de la ligne de main-d'œuvre automatique (base métier CI). */
export const LIGNE_MAIN_OEUVRE = "Main-d'œuvre et mise en œuvre";

/**
 * Base de connaissances métier — construction en Côte d'Ivoire.
 * Toutes les quantités générées par l'IA découlent de ces ratios.
 */
export const NORMES_CI = {
  agglosParM2: 13, // agglos 40×20 cm
  cimentMortierAggloSacParM2: 0.25, // sac 50 kg par m² de mur en agglos de 15 creux
  sableMortierAggloM3ParM2: 0.025, // m³ par m² de mur
  cimentEnduitSacParM2: 0.25, // sac 50 kg par m² de mur, enduit 2 faces
  sableEnduitM3ParM2: 0.03, // m³ par m² de mur, enduit 2 faces
  betonCimentSacsParM3: 7, // béton armé dosé à 350 kg/m³
  betonSableM3ParM3: 0.4,
  betonGravierM3ParM3: 0.8,
  acierPoteauxPoutresKgParM3: 90, // poteaux / poutres / chaînages / dalle
  acierSemellesKgParM3: 50, // semelles de fondation
  carrelagePertesPct: 10, // surface + 10 % de pertes
  carrelageM2ParSacColle: 4.5, // 1 sac de colle 25 kg pour 4,5 m²
  mainOeuvrePctDefaut: 30, // % du total des matériaux
};

/** Prix par défaut (FCFA) — modifiables par l'utilisateur dans le formulaire et dans l'éditeur. */
export const PRIX_DEFAUT = {
  cimentSac50: 4800, // sac de ciment 50 kg
  agglo15Creux: 375, // agglo de 15 creux (pièce)
  ferHA10Barre12m: 4500, // barre 12 m
  ferHA12Barre12m: 6500, // barre 12 m
  ferHA6Barre12m: 1800, // barre 12 m
  sableM3: 7500, // par m³
  gravierM3: 17500, // par m³
  colleCarrelageSac25: 3500, // sac de colle à carrelage 25 kg
};

export type PrixMetier = typeof PRIX_DEFAUT;

/** Poids d'une barre de 12 m (kg) selon le diamètre HA. */
export const POIDS_BARRE_12M = { HA6: 2.66, HA10: 7.4, HA12: 10.66 } as const;

export const CATALOGUE_CI = [
  { categorie: "Prix par défaut CI", designation: "Ciment — sac 50 kg", unite: "sac", prix: PRIX_DEFAUT.cimentSac50, fourchette: "prix par défaut, modifiable" },
  { categorie: "Prix par défaut CI", designation: "Agglo de 15 creux 15×20×40", unite: "u", prix: PRIX_DEFAUT.agglo15Creux, fourchette: "prix par défaut, modifiable" },
  { categorie: "Prix par défaut CI", designation: "Fer à béton HA10 — barre 12 m", unite: "barre", prix: PRIX_DEFAUT.ferHA10Barre12m, fourchette: "prix par défaut, modifiable" },
  { categorie: "Prix par défaut CI", designation: "Fer à béton HA12 — barre 12 m", unite: "barre", prix: PRIX_DEFAUT.ferHA12Barre12m, fourchette: "prix par défaut, modifiable" },
  { categorie: "Prix par défaut CI", designation: "Fer à béton HA6 — barre 12 m (étriers)", unite: "barre", prix: PRIX_DEFAUT.ferHA6Barre12m, fourchette: "prix par défaut, modifiable" },
  { categorie: "Prix par défaut CI", designation: "Sable de construction", unite: "m³", prix: PRIX_DEFAUT.sableM3, fourchette: "prix par défaut, modifiable" },
  { categorie: "Prix par défaut CI", designation: "Gravier concassé", unite: "m³", prix: PRIX_DEFAUT.gravierM3, fourchette: "prix par défaut, modifiable" },
  { categorie: "Liants & Béton", designation: "Colle à carrelage — sac 25 kg (1 sac / 4,5 m²)", unite: "sac", prix: PRIX_DEFAUT.colleCarrelageSac25, fourchette: "3 000 – 4 200" },
  { categorie: "Maçonnerie", designation: "Agglo plein 20×20×40 (soubassement)", unite: "u", prix: 475, fourchette: "425 – 525" },
  { categorie: "Toiture", designation: "Tôle bac alu 35/100e laquée", unite: "m²", prix: 6500, fourchette: "5 800 – 7 500" },
  { categorie: "Toiture", designation: "Charpente bois traité (chevrons + pannes)", unite: "m²", prix: 8500, fourchette: "7 000 – 10 000" },
  { categorie: "Toiture", designation: "Faîtière + accessoires toiture", unite: "ml", prix: 3500, fourchette: "3 000 – 4 200" },
  { categorie: "Finitions", designation: "Peinture vinylique (fourniture, 2 couches)", unite: "m²", prix: 1800, fourchette: "1 500 – 2 400" },
  { categorie: "Finitions", designation: "Carrelage grès cérame (fourniture)", unite: "m²", prix: 6000, fourchette: "4 500 – 9 000" },
  { categorie: "Finitions", designation: "Faïence murale (fourniture)", unite: "m²", prix: 5500, fourchette: "4 500 – 7 500" },
];

function r(n: number, step = 1) {
  return Math.max(step, Math.round(n / step) * step);
}
function q(n: number) {
  return Math.round(n * 10) / 10;
}
function ceil(n: number) {
  return Math.max(0, Math.ceil(n));
}

export function estLigneMainOeuvre(l: { designation: string }) {
  return l.designation.trim().toLowerCase() === LIGNE_MAIN_OEUVRE.toLowerCase();
}

/** Total des matériaux & fournitures = toutes les lignes hors main-d'œuvre automatique. */
export function totalMateriaux(lignes: { quantite: number; prixUnitaire: number; designation: string }[]) {
  return Math.round(lignes.filter((l) => !estLigneMainOeuvre(l)).reduce((s, l) => s + (Number(l.quantite) || 0) * (Number(l.prixUnitaire) || 0), 0));
}

export function montantMainOeuvre(lignes: { quantite: number; prixUnitaire: number; designation: string }[], pct: number) {
  return Math.round((totalMateriaux(lignes) * (Number(pct) || 0)) / 100);
}

/** Prix client unitaire après marge secrète, arrondi aux 5 FCFA (invisible sur le PDF client). */
export function prixAvecMarge(prixUnitaire: number, margePct: number) {
  const m = Math.min(100, Math.max(0, Number(margePct) || 0));
  if (!m) return Math.round(prixUnitaire);
  return Math.round(((Number(prixUnitaire) || 0) * (1 + m / 100)) / 5) * 5;
}

/** Applique la marge secrète à tous les prix unitaires (hors main-d'œuvre, recalculée ensuite). */
export function appliquerMarge<T extends LigneGen>(lignes: T[], margePct: number): T[] {
  return lignes.map((l) => (estLigneMainOeuvre(l) ? l : ({ ...l, prixUnitaire: prixAvecMarge(l.prixUnitaire, margePct) } as T)));
}

export type MoEquipe = { macons: number; manoeuvres: number; jours: number; tauxMacon: number; tauxManoeuvre: number };
export const EQUIPE_DEFAUT: MoEquipe = { macons: 2, manoeuvres: 2, jours: 20, tauxMacon: 7000, tauxManoeuvre: 4000 };
export type MoMode = "pct" | "equipe";

/** Montant du simulateur d'équipe : maçons × jours × taux + manœuvres × jours × taux. */
export function montantEquipe(e?: Partial<MoEquipe> | null) {
  const x = { ...EQUIPE_DEFAUT, ...(e || {}) };
  return Math.round((Number(x.macons) || 0) * (Number(x.jours) || 0) * (Number(x.tauxMacon) || 0) + (Number(x.manoeuvres) || 0) * (Number(x.jours) || 0) * (Number(x.tauxManoeuvre) || 0));
}

export function detailEquipe(e?: Partial<MoEquipe> | null) {
  const x = { ...EQUIPE_DEFAUT, ...(e || {}) };
  return `${x.macons} maçon(s) × ${x.jours} j × ${new Intl.NumberFormat("fr-FR").format(x.tauxMacon)} FCFA + ${x.manoeuvres} manœuvre(s) × ${x.jours} j × ${new Intl.NumberFormat("fr-FR").format(x.tauxManoeuvre)} FCFA (simulateur d'équipe)`;
}

/** Remplace la ligne de main-d'œuvre par un montant calculé (mode équipe). */
export function appliquerMainOeuvreMontant<T extends LigneGen>(lignes: T[], montant: number, detail: string): T[] {
  const sansMO = lignes.filter((l) => !estLigneMainOeuvre(l));
  return [...sansMO, { section: "Main-d'œuvre", designation: LIGNE_MAIN_OEUVRE, detail, unite: "forfait", quantite: 1, prixUnitaire: Math.round(montant) } as T];
}

/** Applique le mode de main-d'œuvre choisi : pourcentage des matériaux OU simulateur d'équipe. */
export function appliquerMainOeuvreSelonMode<T extends LigneGen>(lignes: T[], mode: MoMode, pct: number, equipe?: Partial<MoEquipe> | null): T[] {
  if (mode === "equipe") return appliquerMainOeuvreMontant(lignes, montantEquipe(equipe), detailEquipe(equipe));
  return appliquerMainOeuvre(lignes, pct);
}

/** Lignes telles que le client les voit : prix majorés de la marge, main-d'œuvre recalculée selon le mode choisi. */
export function lignesClient<T extends LigneGen>(lignes: T[], margePct: number, mainOeuvrePct: number, moMode: MoMode = "pct", equipe?: Partial<MoEquipe> | null): T[] {
  const majorees = appliquerMarge(lignes, margePct);
  if (moMode === "equipe") {
    return appliquerMainOeuvreMontant(majorees, prixAvecMarge(montantEquipe(equipe), margePct), detailEquipe(equipe));
  }
  return appliquerMainOeuvre(majorees, mainOeuvrePct);
}

/** Insère ou recalcule la ligne « Main-d'œuvre et mise en œuvre » (% du total matériaux). */
export function appliquerMainOeuvre<T extends LigneGen>(lignes: T[], pct: number): T[] {
  const base = totalMateriaux(lignes);
  const montant = Math.round((base * (Number(pct) || 0)) / 100);
  const detail = `${pct} % du total des matériaux (${new Intl.NumberFormat("fr-FR").format(base)} FCFA) — pourcentage ajustable dans l'éditeur`;
  const sansMO = lignes.filter((l) => !estLigneMainOeuvre(l));
  return [
    ...sansMO,
    { section: "Main-d'œuvre", designation: LIGNE_MAIN_OEUVRE, detail, unite: "forfait", quantite: 1, prixUnitaire: montant } as T,
  ];
}

type BetonMix = { cimentSacs: number; sableM3: number; gravierM3: number };
/** Composition d'un béton armé dosé à 350 kg/m³ selon la norme CI. */
function mixBeton350(volumeM3: number): BetonMix {
  return {
    cimentSacs: volumeM3 * NORMES_CI.betonCimentSacsParM3,
    sableM3: volumeM3 * NORMES_CI.betonSableM3ParM3,
    gravierM3: volumeM3 * NORMES_CI.betonGravierM3ParM3,
  };
}

export function genererDQE(input: {
  natureTravaux: string;
  surface: number;
  nbPieces: number;
  nbEtages: number;
  lieu: string;
  hasPhoto: boolean;
  prix?: Partial<PrixMetier>;
  mainOeuvrePct?: number;
  moMode?: MoMode;
  equipe?: Partial<MoEquipe>;
}): LigneGen[] {
  const P: PrixMetier = { ...PRIX_DEFAUT, ...(input.prix || {}) };
  const moPct = Math.min(100, Math.max(0, Number(input.mainOeuvrePct ?? NORMES_CI.mainOeuvrePctDefaut)));
  const surf = Math.max(20, input.surface || 100);
  const etages = Math.max(1, input.nbEtages || 1);
  const txt = (input.natureTravaux || "").toLowerCase();
  const isCloture = txt.includes("cloture") || txt.includes("clôture") || txt.includes("mur de cloture");
  const isRenov = txt.includes("renov") || txt.includes("rénov") || txt.includes("rehabilit") || txt.includes("revetement") || txt.includes("peinture seule");
  const isDalle = txt.includes("dalle") || txt.includes("dallage");
  const isVilla = txt.includes("villa") || txt.includes("maison") || txt.includes("duplex") || txt.includes("immeuble") || txt.includes("r+") || txt.includes("construction");
  const perimetre = q(4 * Math.sqrt(surf));
  const surfMursExt = q(perimetre * 3 * etages);
  const surfMursTot = q(surfMursExt * 1.55); // murs extérieurs + refends/cloisons

  const lignes: LigneGen[] = [];
  const add = (section: string, designation: string, detail: string, unite: string, quantite: number, prixUnitaire: number) =>
    lignes.push({ section, designation, detail, unite, quantite: q(quantite), prixUnitaire });

  const fmt = (n: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(n);

  /** Ajoute les 3 lignes matériaux consolidées béton + mortiers + enduits, sans double comptage. */
  function addMateriauxBetonMortier(beton: BetonMix, surfMurAgglo: number, cimentExtra = 0, sableExtra = 0) {
    const cimentMortier = surfMurAgglo * NORMES_CI.cimentMortierAggloSacParM2;
    const cimentEnduit = surfMurAgglo * NORMES_CI.cimentEnduitSacParM2;
    const sableMortier = surfMurAgglo * NORMES_CI.sableMortierAggloM3ParM2;
    const sableEnduit = surfMurAgglo * NORMES_CI.sableEnduitM3ParM2;
    const cimentTotal = ceil(beton.cimentSacs + cimentMortier + cimentEnduit + cimentExtra);
    const sableTotal = q(beton.sableM3 + sableMortier + sableEnduit + sableExtra);
    const gravierTotal = q(beton.gravierM3);
    add(
      "Matériaux — Ciment, sable, gravier",
      "Ciment — sac 50 kg",
      `Béton 350 kg/m³ : ${fmt(beton.cimentSacs)} sacs (7/m³) + mortier agglos : ${fmt(cimentMortier)} (0,25/m²) + enduit 2 faces : ${fmt(cimentEnduit)} (0,25/m²)`,
      "sac",
      cimentTotal,
      P.cimentSac50
    );
    add(
      "Matériaux — Ciment, sable, gravier",
      "Sable de construction",
      `Béton : ${fmt(beton.sableM3)} m³ (0,40/m³) + mortier agglos : ${fmt(sableMortier)} m³ (0,025/m²) + enduit : ${fmt(sableEnduit)} m³ (0,03/m²)`,
      "m³",
      sableTotal,
      P.sableM3
    );
    if (gravierTotal > 0)
      add("Matériaux — Ciment, sable, gravier", "Gravier concassé", `Béton armé : ${fmt(gravierTotal)} m³ (0,80 m³ par m³ de béton dosé 350)`, "m³", gravierTotal, P.gravierM3);
    return { cimentTotal, sableTotal, gravierTotal };
  }

  /** Répartit l'acier HA en barres de 12 m : HA12 porteurs, HA10 courants/semelles, HA6 étriers. */
  function addAcier(volSemelles: number, volStructure: number, section = "Acier & Ferraillage") {
    const kgSemelles = volSemelles * NORMES_CI.acierSemellesKgParM3;
    const kgStructure = volStructure * NORMES_CI.acierPoteauxPoutresKgParM3;
    const kgHA12 = kgStructure * 0.5;
    const kgHA10 = kgStructure * 0.3 + kgSemelles * 0.7;
    const kgHA6 = kgStructure * 0.2 + kgSemelles * 0.3;
    add(section, "Fer à béton HA12 — barre 12 m", `Poteaux/poutres : ${fmt(kgStructure)} kg à 90 kg/m³, part HA12 ≈ ${fmt(kgHA12)} kg ÷ ${POIDS_BARRE_12M.HA12} kg/barre`, "barre", Math.max(1, ceil(kgHA12 / POIDS_BARRE_12M.HA12)), P.ferHA12Barre12m);
    add(section, "Fer à béton HA10 — barre 12 m", `Semelles : ${fmt(kgSemelles)} kg à 50 kg/m³ + chaînages, part HA10 ≈ ${fmt(kgHA10)} kg ÷ ${POIDS_BARRE_12M.HA10} kg/barre`, "barre", Math.max(1, ceil(kgHA10 / POIDS_BARRE_12M.HA10)), P.ferHA10Barre12m);
    add(section, "Fer à béton HA6 — barre 12 m", `Étriers, cadres et épingles ≈ ${fmt(kgHA6)} kg ÷ ${POIDS_BARRE_12M.HA6} kg/barre`, "barre", Math.max(1, ceil(kgHA6 / POIDS_BARRE_12M.HA6)), P.ferHA6Barre12m);
    add(section, "Fil d'attache, cales à béton et divers ferraillage", "Consommables d'atelier de ferraillage", "forfait", Math.max(1, etages), 25000);
  }

  if (isCloture && !isVilla) {
    const longueur = Math.max(40, surf / 2);
    const hauteur = 2.1;
    const surfMur = q(longueur * hauteur);
    const surfSoub = q(longueur * 0.6);
    const volSemelles = q(longueur * 0.18);
    const volStructure = q(longueur * 0.09); // longrines + poteaux raidisseurs
    const mix = mixBeton350(volSemelles + volStructure);
    add("Terrassement & Implantation", "Implantation + fouilles en rigole", `Longueur estimée ${r(longueur)} ml, prof. 60 cm`, "ml", longueur, 2500);
    add("Fondations & Structure", "Béton de propreté dosé 150 kg/m³", "Ép. 5 cm en fond de fouille, fourniture incluse", "m³", q(longueur * 0.05), 65000);
    add("Fondations & Structure", "Semelle filante + longrines BA dosé 350 kg/m³", `${fmt(volSemelles + volStructure)} m³ — matériaux comptés dans les lignes ciment/sable/gravier, coffrage et eau inclus ici`, "m³", q(volSemelles + volStructure), 18000);
    addMateriauxBetonMortier(mix, surfMur);
    addAcier(volSemelles, volStructure);
    add("Maçonnerie", "Agglo plein 20×20×40 (soubassement)", `${fmt(surfSoub)} m² × 13 agglos/m² (format 40×20)`, "u", ceil(surfSoub * NORMES_CI.agglosParM2), 475);
    add("Maçonnerie", "Agglos de 15 creux 15×20×40 (élévation)", `${fmt(surfMur)} m² de mur × 13 agglos/m² — hauteur ${hauteur} m, poteaux raidisseurs tous les 3 m`, "u", ceil(surfMur * NORMES_CI.agglosParM2), P.agglo15Creux);
    add("Finitions", "Enduit mortier 2 faces (consommables + échafaudage)", `Ciment et sable d'enduit comptés dans les lignes matériaux (0,25 sac + 0,03 m³ par m²)`, "m²", surfMur, 600);
    return appliquerMainOeuvreSelonMode(lignes, input.moMode || 'pct', moPct, input.equipe);
  }

  if (isRenov && !isVilla) {
    const surfEnduit = q(surf * 1.8);
    const cimentEnduit = surfEnduit * NORMES_CI.cimentEnduitSacParM2;
    const sableEnduit = surfEnduit * NORMES_CI.sableEnduitM3ParM2;
    const surfCarrelage = q(surf * 0.45);
    const carrelageAvecPertes = q(surfCarrelage * (1 + NORMES_CI.carrelagePertesPct / 100));
    add("Préparation", "Protection, dépose & évacuation gravats", "Remise en état des supports", "forfait", 1, r(surf * 900, 5000));
    add("Matériaux — Ciment, sable, gravier", "Ciment — sac 50 kg", `Enduit 2 faces : ${fmt(surfEnduit)} m² × 0,25 sac/m² = ${fmt(cimentEnduit)} sacs`, "sac", ceil(cimentEnduit), P.cimentSac50);
    add("Matériaux — Ciment, sable, gravier", "Sable fin tamisé", `Enduit 2 faces : ${fmt(surfEnduit)} m² × 0,03 m³/m² = ${fmt(sableEnduit)} m³`, "m³", q(sableEnduit), P.sableM3);
    add("Finitions", "Enduit de reprise (consommables + échafaudage)", "Ciment et sable comptés dans les lignes matériaux ci-dessus", "m²", surfEnduit, 600);
    add("Finitions", "Peinture vinylique — fourniture 2 couches", "Primaire + 2 couches, pose comptée en main-d'œuvre", "m²", q(surf * 2.4), 1800);
    add("Finitions", "Carrelage grès cérame — fourniture", `${fmt(surfCarrelage)} m² à carreler + 10 % de pertes = ${fmt(carrelageAvecPertes)} m² à acheter`, "m²", carrelageAvecPertes, 6000);
    add("Finitions", "Colle à carrelage — sac 25 kg", `1 sac pour 4,5 m² : ${fmt(surfCarrelage)} m² ÷ 4,5`, "sac", ceil(surfCarrelage / NORMES_CI.carrelageM2ParSacColle), P.colleCarrelageSac25);
    add("Menuiserie & Divers", "Révision menuiserie + quincaillerie", "Portes, serrures, reprises", "forfait", 1, r(surf * 1200, 5000));
    return appliquerMainOeuvreSelonMode(lignes, input.moMode || 'pct', moPct, input.equipe);
  }

  // Cas principal : construction neuve / villa / duplex / dalle
  const volSemelles = q(surf * 0.15 * (etages > 1 ? 1.3 : 1));
  const volLongrines = q(volSemelles * 0.35);
  const volPoteauxPoutres = q(surf * 0.09 * etages);
  const volDalle = q(surf * (isDalle ? 0.1 : 0.12) * etages);
  const volStructure = q(volLongrines + volPoteauxPoutres + volDalle);
  const volBA = q(volSemelles + volStructure);
  const mix = mixBeton350(volBA);
  const surfCarrelage = q(surf * etages * 0.92);
  const carrelageAvecPertes = q(surfCarrelage * (1 + NORMES_CI.carrelagePertesPct / 100));

  add("Terrassement & Implantation", "Implantation, décapage & nivellement", `Emprise au sol ${surf} m² — terrain ${input.lieu}`, "m²", surf, 1800);
  add("Terrassement & Implantation", "Fouilles en rigoles et puits (fondations)", "Profondeur moyenne 1,20 m — sol latéritique", "m³", q(surf * 0.45), 7500);
  add("Terrassement & Implantation", "Remblai compacté + traitement anti-termites", "Apport latérite compactée par couches", "m²", surf, 2200);

  add("Fondations & Structure", "Béton de propreté dosé 150 kg/m³", "Épaisseur 5 cm sous semelles, fourniture incluse", "m³", q(volSemelles * 0.25), 65000);
  add("Fondations & Structure", "Semelles filantes / isolées BA dosé 350 kg/m³", `${fmt(volSemelles)} m³ — acier à 50 kg/m³, matériaux dans les lignes ciment/sable/gravier, coffrage inclus ici`, "m³", volSemelles, 15000);
  add("Fondations & Structure", "Longrines, poteaux, poutres & chaînages BA dosé 350 kg/m³", `${fmt(q(volLongrines + volPoteauxPoutres))} m³ — acier à 90 kg/m³, matériaux dans les lignes ciment/sable/gravier, coffrage inclus ici`, "m³", q(volLongrines + volPoteauxPoutres), 22000);
  add("Fondations & Structure", isDalle ? "Dallage béton armé ép. 10 cm" : "Dalle pleine / hourdis — béton armé dosé 350 kg/m³", `${fmt(volDalle)} m³ pour ${fmt(surfCarrelage)} m² de plancher — acier à 90 kg/m³`, "m³", volDalle, 22000);

  addMateriauxBetonMortier(mix, surfMursTot);
  addAcier(volSemelles, volStructure);

  add("Maçonnerie", "Agglos de 15 creux 15×20×40 — murs extérieurs & refends", `${fmt(surfMursTot)} m² de murs × 13 agglos/m² (format 40×20 cm)`, "u", ceil(surfMursTot * NORMES_CI.agglosParM2), P.agglo15Creux);
  add("Maçonnerie", "Agglo plein 20×20×40 — soubassement", `${fmt(q(perimetre * 0.6))} m² × 13 agglos/m², 2 rangs + arase étanche`, "u", ceil(perimetre * 0.6 * NORMES_CI.agglosParM2), 475);

  add("Toiture & Charpente", "Charpente bois traité (pannes + chevrons) — fourniture", `Toiture ${fmt(q(surf * 1.18))} m² avec débords 50 cm, pose en main-d'œuvre`, "m²", q(surf * 1.18), 8500);
  add("Toiture & Charpente", "Tôle bac alu laquée 35/100e + fixations — fourniture", "Coloris au choix du client", "m²", q(surf * 1.18), 6500);
  add("Toiture & Charpente", "Faîtière, rives & étanchéité", "", "ml", perimetre, 3500);

  add("Enduits, Peinture & Revêtements", "Enduit mortier 2 faces (consommables + échafaudage)", `${fmt(surfMursTot)} m² de mur — ciment (0,25 sac/m²) et sable (0,03 m³/m²) comptés dans les lignes matériaux`, "m²", surfMursTot, 600);
  add("Enduits, Peinture & Revêtements", "Peinture vinylique — fourniture 2 couches", "Primaire + 2 couches de finition, pose en main-d'œuvre", "m²", q(surfMursTot * 1.7), 1800);
  add("Enduits, Peinture & Revêtements", "Carrelage sol grès cérame — fourniture", `${fmt(surfCarrelage)} m² à carreler + 10 % de pertes = ${fmt(carrelageAvecPertes)} m² à acheter`, "m²", carrelageAvecPertes, 6000);
  add("Enduits, Peinture & Revêtements", "Colle à carrelage — sac 25 kg", `1 sac pour 4,5 m² : ${fmt(surfCarrelage)} m² ÷ 4,5`, "sac", ceil(surfCarrelage / NORMES_CI.carrelageM2ParSacColle), P.colleCarrelageSac25);
  add("Enduits, Peinture & Revêtements", "Faïence murale SDB / cuisine — fourniture", "Jusqu'à 2,10 m de hauteur dans les pièces humides", "m²", q(input.nbPieces * 9), 5500);

  add("Plomberie, Électricité & Menuiserie", "Plomberie complète (adduction, évacuation, sanitaires) — fournitures", `${input.nbPieces} pièces — réseaux et équipements, pose en main-d'œuvre`, "forfait", 1, r(450000 + input.nbPieces * 55000, 5000));
  add("Plomberie, Électricité & Menuiserie", "Électricité (gainage, câblage, tableau, appareillage) — fournitures", "Norme CIE — disjoncteur différentiel + prise de terre", "forfait", 1, r(380000 + surf * 1800, 5000));
  add("Plomberie, Électricité & Menuiserie", "Menuiserie alu, portes et portail — provision fournitures", "À affiner selon le standing choisi par le client", "forfait", 1, r(520000 + input.nbPieces * 65000, 5000));

  return appliquerMainOeuvreSelonMode(lignes, input.moMode || 'pct', moPct, input.equipe);
}

export function calculerTotaux(
  lignes: { section?: string; designation: string; detail?: string | null; unite?: string; quantite: number; prixUnitaire: number }[],
  tvaPct = 18,
  remisePct = 0,
  mainOeuvrePct: number = NORMES_CI.mainOeuvrePctDefaut,
  margePct = 0,
  moMode: MoMode = "pct",
  equipe?: Partial<MoEquipe> | null
) {
  // Les lignes stockées sont les prix de revient (base). La marge majore les prix clients.
  const matBase = totalMateriaux(lignes);
  const moBase = moMode === "equipe" ? montantEquipe(equipe) : montantMainOeuvre(lignes, mainOeuvrePct);
  const normalised: LigneGen[] = lignes.map((l) => ({ section: l.section || "", designation: l.designation, detail: l.detail || "", unite: l.unite || "u", quantite: l.quantite, prixUnitaire: l.prixUnitaire }));
  const client = lignesClient(normalised, margePct, mainOeuvrePct, moMode, equipe);
  const mat = totalMateriaux(client);
  const mo = client.filter(estLigneMainOeuvre).reduce((s, l) => s + l.quantite * l.prixUnitaire, 0);
  const totalHTbrut = mat + mo;
  const montantMarge = totalHTbrut - (matBase + moBase);
  const remise = Math.round((totalHTbrut * remisePct) / 100);
  const totalHT = totalHTbrut - remise;
  const tva = Math.round((totalHT * tvaPct) / 100);
  // Mode « Matériaux fournis par le client » : seul le travail est facturé.
  const moSeuleHT = Math.max(0, Math.round(mo - (totalHTbrut ? (remise * mo) / totalHTbrut : 0)));
  const moSeuleTVA = Math.round((moSeuleHT * tvaPct) / 100);
  return {
    moSeuleHT,
    moSeuleTTC: moSeuleHT + moSeuleTVA,
    totalMateriauxBase: matBase,
    montantMainOeuvreBase: moBase,
    margePct,
    montantMarge,
    totalMateriaux: mat,
    mainOeuvrePct,
    montantMainOeuvre: mo,
    totalHTbrut,
    remise,
    totalHT,
    tva,
    totalTTC: totalHT + tva,
  };
}

/** Quantités nettes à commander (sans prix, sans main-d'œuvre) pour la quincaillerie. */
export function listeAchatsMateriaux(lignes: { section: string; designation: string; unite: string; quantite: number }[]) {
  const achat = (l: { section: string; designation: string }) => {
    if (estLigneMainOeuvre(l)) return false;
    const d = l.designation.toLowerCase();
    if (l.section.startsWith("Matériaux") || l.section.startsWith("Acier")) return true;
    if (l.section.startsWith("Maçonnerie") && (d.includes("agglo") || d.includes("brique"))) return true;
    if (l.section.startsWith("Toiture")) return true;
    if (d.includes("carrelage") || d.includes("colle à carrelage") || d.includes("faience") || d.includes("faïence")) return true;
    return false;
  };
  const map = new Map<string, { designation: string; unite: string; quantite: number }>();
  for (const l of lignes.filter(achat)) {
    const key = `${l.designation}|${l.unite}`;
    const cur = map.get(key) || { designation: l.designation, unite: l.unite, quantite: 0 };
    cur.quantite += Number(l.quantite) || 0;
    map.set(key, cur);
  }
  return Array.from(map.values()).map((a) => ({
    ...a,
    quantite: ["sac", "barre", "u", "forfait"].includes(a.unite) ? Math.ceil(a.quantite) : Math.round(a.quantite * 10) / 10,
  }));
}

// ================= FORMATS D'EXPORT PDF (3 NIVEAUX) =================
export type FormatPdf = "general" | "materiaux" | "detaille";
export const FORMATS_PDF: { id: FormatPdf; label: string; desc: string }[] = [
  { id: "general", label: "Devis Général", desc: "Résumé par lots, recommandé client" },
  { id: "materiaux", label: "Par Matériaux", desc: "Totaux par catégorie, sans détails" },
  { id: "detaille", label: "DQE Complet", desc: "Toutes les lignes, quantités et prix unitaires" },
];

/** Regroupe une section du DQE en grand lot client (format Général). */
export function lotDeSection(section: string): string {
  const s = section.toLowerCase();
  if (s.includes("terrassement")) return "Terrassement & implantation";
  if (s.includes("fondation") || s.includes("acier") || s.includes("structure")) return "Fondations & béton armé";
  if (s.includes("matériaux") || s.includes("materiaux")) return "Matériaux de gros œuvre";
  if (s.includes("maçonnerie") || s.includes("maconnerie")) return "Maçonnerie";
  if (s.includes("toiture") || s.includes("charpente")) return "Toiture & charpente";
  if (s.includes("enduit") || s.includes("peinture") || s.includes("revêtement") || s.includes("revetement")) return "Finitions & revêtements";
  if (s.includes("plomberie") || s.includes("électricité") || s.includes("electricite") || s.includes("menuiserie")) return "Second œuvre (plomberie, électricité, menuiserie)";
  if (s.includes("main-d")) return "Main-d'œuvre et mise en œuvre";
  if (s.includes("préparation") || s.includes("preparation")) return "Préparation du chantier";
  return section;
}

export type ResumeLigne = { nom: string; montant: number; quantite?: number; unite?: string; nbLignes: number };

function agreger(lignes: { designation: string; section?: string; unite?: string; quantite: number; prixUnitaire: number }[], cle: (l: { designation: string; section: string; unite?: string; quantite: number }) => { nom: string; quantite?: number; unite?: string }): ResumeLigne[] {
  const map = new Map<string, ResumeLigne>();
  for (const l of lignes) {
    const k = cle({ designation: l.designation, section: l.section || "", unite: l.unite, quantite: l.quantite });
    const cur = map.get(k.nom) || { nom: k.nom, montant: 0, quantite: 0, unite: k.unite, nbLignes: 0 };
    cur.montant += (Number(l.quantite) || 0) * (Number(l.prixUnitaire) || 0);
    if (k.quantite !== undefined && cur.unite === k.unite) cur.quantite = (cur.quantite || 0) + k.quantite;
    cur.nbLignes += 1;
    map.set(k.nom, cur);
  }
  return Array.from(map.values()).sort((a, b) => b.montant - a.montant);
}

/** Format A — résumé par grandes étapes/lots (aucune quantité unitaire). */
export function resumeParLot(lignes: (LigneGen & { section: string })[]): ResumeLigne[] {
  const map = new Map<string, ResumeLigne>();
  for (const l of lignes) {
    const nom = lotDeSection(l.section || "");
    const cur = map.get(nom) || { nom, montant: 0, nbLignes: 0 };
    cur.montant += (Number(l.quantite) || 0) * (Number(l.prixUnitaire) || 0);
    cur.nbLignes += 1;
    map.set(nom, cur);
  }
  return Array.from(map.values());
}

/** Catégorie de matériau d'une ligne (format B). */
export function categorieMateriau(l: { designation: string; section: string }): string {
  if (estLigneMainOeuvre(l)) return "Main-d'œuvre";
  const d = l.designation.toLowerCase();
  if (d.includes("ciment")) return "Ciment";
  if (d.includes("fer à béton") || d.includes("fer a beton") || d.includes("fil d'attache") || d.includes("acier")) return "Fer & acier";
  if (d.includes("agglo") || d.includes("brique")) return "Briques & agglos";
  if (d.includes("sable")) return "Sable";
  if (d.includes("gravier")) return "Gravier";
  if (d.includes("carrelage") || d.includes("colle") || d.includes("faïence") || d.includes("faience") || d.includes("peinture")) return "Revêtements & peinture";
  if (d.includes("tôle") || d.includes("tole") || d.includes("charpente") || d.includes("faîtière") || d.includes("faitiere")) return "Toiture";
  if (d.includes("béton") || d.includes("beton")) return "Béton (coffrage & mise en place)";
  if (l.section.toLowerCase().includes("plomberie") || d.includes("plomberie") || d.includes("électricité") || d.includes("menuiserie")) return "Second œuvre & équipements";
  if (l.section.toLowerCase().includes("terrassement")) return "Terrassement";
  return "Autres matériaux & fournitures";
}

/** Format B — totaux par catégorie de matériaux (sans ratios ni sous-détails). */
export function resumeParCategorie(lignes: (LigneGen & { section: string })[]): ResumeLigne[] {
  return agreger(lignes, (l) => {
    const nom = categorieMateriau(l);
    // Quantité affichée uniquement quand la catégorie a une unité homogène simple.
    const uniteSimple = ["Ciment", "Sable", "Gravier", "Briques & agglos"].includes(nom) ? (l as LigneGen).unite : undefined;
    return { nom, quantite: uniteSimple ? (l as LigneGen).quantite : undefined, unite: uniteSimple };
  });
}

// ================= PLANNING ESTIMATIF IA =================
export type EtapePlanning = { etape: string; dureeJours: number; detail: string };

export function genererPlanning(input: { natureTravaux: string; surface: number; nbPieces: number; nbEtages: number }): EtapePlanning[] {
  const surf = Math.max(20, input.surface || 100);
  const etages = Math.max(1, input.nbEtages || 1);
  const txt = (input.natureTravaux || "").toLowerCase();
  const j = (n: number) => Math.max(1, Math.ceil(n));
  if (txt.includes("cloture") || txt.includes("clôture")) {
    const longueur = Math.max(40, surf / 2);
    return [
      { etape: "Implantation & fouilles", dureeJours: j(longueur / 18), detail: `Piquetage et fouilles en rigole sur ~${Math.round(longueur)} ml` },
      { etape: "Fondations", dureeJours: j(longueur / 14), detail: "Semelles filantes, longrines et arase" },
      { etape: "Élévation", dureeJours: j(longueur / 9), detail: "Murs en agglos et poteaux raidisseurs" },
      { etape: "Finitions", dureeJours: j(longueur / 16), detail: "Enduit 2 faces, pose du portail et nettoyage" },
    ];
  }
  if (txt.includes("renov") || txt.includes("rénov") || txt.includes("rehabilit")) {
    return [
      { etape: "Préparation & dépose", dureeJours: j(surf / 35), detail: "Protection, dépose et évacuation des gravats" },
      { etape: "Reprises & enduits", dureeJours: j(surf / 16), detail: "Reprise des supports et enduits 2 faces" },
      { etape: "Revêtements", dureeJours: j(surf / 14), detail: "Carrelage, faïence et colle (1 sac / 4,5 m²)" },
      { etape: "Peinture & finitions", dureeJours: j(surf / 18), detail: "Peinture 2 couches, menuiserie et réception" },
    ];
  }
  const facteurEtage = etages > 1 ? 1.3 : 1;
  return [
    { etape: "Terrassement & implantation", dureeJours: j(surf / 45), detail: "Décapage, nivellement, fouilles et remblai anti-termites" },
    { etape: "Fondations", dureeJours: j((surf / 15) * facteurEtage), detail: "Semelles BA 350 kg/m³ (acier 50 kg/m³), longrines et soubassement" },
    { etape: "Élévation", dureeJours: j((surf * etages) / 10.5), detail: "Murs en agglos (13/m²), poteaux/poutres et dalle (acier 90 kg/m³)" },
    { etape: "Toiture", dureeJours: j(surf / 22), detail: "Charpente bois traité et tôle bac alu" },
    { etape: "Second œuvre", dureeJours: j(surf / 16), detail: "Plomberie, électricité et menuiseries" },
    { etape: "Enduits & revêtements", dureeJours: j((surf * etages) / 13), detail: "Enduits 2 faces, carrelage (+10 % de pertes) et faïence" },
    { etape: "Peinture & finitions", dureeJours: j((surf * etages) / 20), detail: "Peinture 2 couches, quincaillerie et nettoyage de fin de chantier" },
    { etape: "Réception des travaux", dureeJours: 2, detail: "Visite de réception, levée des réserves et remise des clés" },
  ];
}

export function totalPlanningJours(etapes: { dureeJours: number }[]) {
  return etapes.reduce((s, e) => s + (Number(e.dureeJours) || 0), 0);
}

// ================= VALIDITÉ DE L'OFFRE =================
export function clauseValidite(jours: number, dateEmission?: string | Date | null) {
  const d = dateEmission ? new Date(dateEmission) : new Date();
  const exp = new Date(d); exp.setDate(exp.getDate() + (Number(jours) || 30));
  const fmt = (x: Date) => x.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  return {
    jours: Number(jours) || 30,
    dateEmission: fmt(d),
    dateExpiration: fmt(exp),
    texte: `Validité de l'offre : ${jours} jours calendaires à compter du ${fmt(d)}, soit jusqu'au ${fmt(exp)}. Au-delà de ce délai, si le prix des matériaux de construction (ciment, fer à béton, sable, gravier, agglos) a augmenté sur le marché en Côte d'Ivoire, les prix unitaires du présent devis pourront être révisés à due proportion de la hausse constatée, après notification écrite au client et avant tout approvisionnement concerné. Aucune révision ne s'appliquera aux travaux déjà exécutés ni aux matériaux déjà approvisionnés et payés.`,
  };
}

// ================= AVENANT : SUGGESTIONS IA =================
export function suggererLignesAvenant(description: string, surfaceRef = 100): LigneGen[] {
  const txt = (description || "").toLowerCase();
  const lignes: LigneGen[] = [];
  const add = (designation: string, detail: string, unite: string, quantite: number, prixUnitaire: number) =>
    lignes.push({ section: "Travaux supplémentaires", designation, detail, unite, quantite: Math.round(quantite * 10) / 10, prixUnitaire });
  const surf = Math.max(20, surfaceRef);
  if (txt.includes("peinture")) add("Peinture vinylique 2 couches (fourniture + pose)", "Travaux supplémentaires demandés par le client", "m²", Math.round(surf * 0.6), 2800);
  if (txt.includes("carrelage") || txt.includes("faience") || txt.includes("faïence")) { add("Carrelage / faïence (fourniture + pose)", "Surface + 10 % de pertes incluse", "m²", Math.round(surf * 0.35), 9500); add("Colle à carrelage — sac 25 kg", "1 sac pour 4,5 m²", "sac", Math.ceil((surf * 0.35) / 4.5), 3500); }
  if (txt.includes("dalle") || txt.includes("beton") || txt.includes("béton")) { add("Dalle / ouvrage béton armé dosé 350 kg/m³", "7 sacs de ciment + 0,40 m³ sable + 0,80 m³ gravier par m³", "m³", Math.max(2, Math.round(surf * 0.05)), 85000); }
  if (txt.includes("cloture") || txt.includes("clôture") || txt.includes("mur")) { add("Élévation mur en agglos de 15 creux", "13 agglos/m², mortier et enduit inclus", "m²", Math.round(surf * 0.4), 9500); }
  if (txt.includes("porte") || txt.includes("portail") || txt.includes("fenetre") || txt.includes("fenêtre") || txt.includes("menuiserie")) add("Menuiserie supplémentaire (porte / portail / fenêtre)", "Fourniture et pose, modèle à valider avec le client", "u", 1, 150000);
  if (txt.includes("electric") || txt.includes("électr") || txt.includes("clim") || txt.includes("luminaire")) add("Points électriques supplémentaires (prises, luminaires, clim)", "Gainage, câblage et appareillage", "forfait", 1, 120000);
  if (txt.includes("plomb") || txt.includes("salle de bain") || txt.includes("sdb") || txt.includes("wc") || txt.includes("sanitaire")) add("Plomberie supplémentaire (point d'eau + évacuation)", "Fourniture et pose", "forfait", 1, 140000);
  if (txt.includes("toiture") || txt.includes("tole") || txt.includes("tôle") || txt.includes("etanche") || txt.includes("étanche")) add("Travaux de toiture supplémentaires", "Tôle bac alu et étanchéité, fourniture + pose", "m²", Math.round(surf * 0.3), 12000);
  if (txt.includes("faux plafond") || txt.includes("staff") || txt.includes("placo")) add("Faux plafond (fourniture + pose)", "Finition au choix du client", "m²", Math.round(surf * 0.4), 8500);
  if (lignes.length === 0) {
    add("Travaux supplémentaires (à détailler)", description || "Selon demande du client", "forfait", 1, 100000);
    add("Matériaux complémentaires", "Selon métré contradictoire sur site", "forfait", 1, 50000);
  }
  const base = lignes.reduce((s, l) => s + l.quantite * l.prixUnitaire, 0);
  lignes.push({ section: "Travaux supplémentaires", designation: "Main-d'œuvre travaux supplémentaires", detail: "30 % des travaux supplémentaires ci-dessus (ajustable)", unite: "forfait", quantite: 1, prixUnitaire: Math.round(base * 0.3) });
  return lignes;
}
