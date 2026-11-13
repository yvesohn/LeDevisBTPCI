import { pgTable, serial, text, integer, real, timestamp, boolean } from "drizzle-orm/pg-core";

export const entreprises = pgTable("entreprises", {
  id: serial("id").primaryKey(),
  nom: text("nom").notNull().default("SARL Bâtir Ivoire"),
  proprietaire: text("proprietaire").notNull().default("Kouadio Yao"),
  telephone: text("telephone").notNull().default("+225 07 07 12 34 56"),
  email: text("email").default("contact@batir-ivoire.ci"),
  ville: text("ville").default("Abidjan, Cocody"),
  adresse: text("adresse").default(""),
  rccm: text("rccm"),
  compteContribuable: text("compte_contribuable"),
  logoData: text("logo_data").default(""),
  logoNom: text("logo_nom").default(""),
  signatureData: text("signature_data").default(""),
  signatureNom: text("signature_nom").default(""),
  cachetData: text("cachet_data").default(""),
  cachetNom: text("cachet_nom").default(""),
  passwordHash: text("password_hash").notNull().default(""),
  role: text("role").notNull().default("client"), // fondateur | collaborateur | admin | client
  formatPdfDefaut: text("format_pdf_defaut").notNull().default("general"), // option A par défaut
  bloque: boolean("bloque").notNull().default(false),
  credits: integer("credits").notNull().default(1),
  plan: text("plan").notNull().default("gratuit"), // gratuit | unique | pack5 | illimite
  illimiteExpireAt: timestamp("illimite_expire_at"),
  totalDevisGeneres: integer("total_devis_generes").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const sessions = pgTable("sessions", {
  token: text("token").primaryKey(),
  entrepriseId: integer("entreprise_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
});

export const devis = pgTable("devis", {
  id: serial("id").primaryKey(),
  entrepriseId: integer("entreprise_id").notNull().default(0),
  numero: text("numero").notNull(),
  clientNom: text("client_nom").notNull(),
  clientTel: text("client_tel").default(""),
  lieu: text("lieu").notNull(),
  natureTravaux: text("nature_travaux").notNull(),
  surface: real("surface").default(100),
  nbPieces: integer("nb_pieces").default(4),
  nbEtages: integer("nb_etages").default(1),
  photoPlanNom: text("photo_plan_nom").default(""),
  photoPlanTaille: text("photo_plan_taille").default(""),
  statut: text("statut").notNull().default("brouillon"), // brouillon | pret | envoye | signe
  totalHT: integer("total_ht").notNull().default(0),
  tvaPct: real("tva_pct").notNull().default(18),
  remisePct: real("remise_pct").notNull().default(0),
  mainOeuvrePct: real("main_oeuvre_pct").notNull().default(30),
  totalMateriaux: integer("total_materiaux").notNull().default(0),
  montantMainOeuvre: integer("montant_main_oeuvre").notNull().default(0),
  margePct: real("marge_pct").notNull().default(0),
  totalMateriauxBase: integer("total_materiaux_base").notNull().default(0),
  montantMarge: integer("montant_marge").notNull().default(0),
  totalTTC: integer("total_ttc").notNull().default(0),
  validiteJours: integer("validite_jours").notNull().default(30),
  formatPdf: text("format_pdf").notNull().default("general"),
  moMode: text("mo_mode").notNull().default("pct"), // pct | equipe
  moMacons: integer("mo_macons").notNull().default(2),
  moManoeuvres: integer("mo_manoeuvres").notNull().default(2),
  moJours: integer("mo_jours").notNull().default(20),
  moTauxMacon: integer("mo_taux_macon").notNull().default(7000),
  moTauxManoeuvre: integer("mo_taux_manoeuvre").notNull().default(4000),
  shareToken: text("share_token"),
  signatureClientData: text("signature_client_data").default(""),
  signatureClientNom: text("signature_client_nom").default(""),
  signedAt: timestamp("signed_at"),
  materiauxClient: boolean("materiaux_client").notNull().default(false),
  totalMoSeuleTTC: integer("total_mo_seule_ttc").notNull().default(0),
  notes: text("notes").default(""),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const etapesPlanning = pgTable("etapes_planning", {
  id: serial("id").primaryKey(),
  devisId: integer("devis_id").notNull(),
  etape: text("etape").notNull(),
  dureeJours: integer("duree_jours").notNull().default(1),
  detail: text("detail").default(""),
  ordre: integer("ordre").notNull().default(0),
});

export const avenants = pgTable("avenants", {
  id: serial("id").primaryKey(),
  devisId: integer("devis_id").notNull(),
  numero: text("numero").notNull(),
  titre: text("titre").notNull().default("Travaux supplémentaires"),
  description: text("description").default(""),
  statut: text("statut").notNull().default("brouillon"), // brouillon | envoye | signe
  tvaPct: real("tva_pct").notNull().default(18),
  totalHT: integer("total_ht").notNull().default(0),
  totalTTC: integer("total_ttc").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const avenantLignes = pgTable("avenant_lignes", {
  id: serial("id").primaryKey(),
  avenantId: integer("avenant_id").notNull(),
  designation: text("designation").notNull(),
  detail: text("detail").default(""),
  unite: text("unite").notNull().default("u"),
  quantite: real("quantite").notNull().default(1),
  prixUnitaire: integer("prix_unitaire").notNull().default(0),
  ordre: integer("ordre").notNull().default(0),
});

export const depenses = pgTable("depenses", {
  id: serial("id").primaryKey(),
  devisId: integer("devis_id").notNull(),
  libelle: text("libelle").notNull(),
  montant: integer("montant").notNull().default(0),
  dateDepense: text("date_depense").default(""),
  createdAt: timestamp("created_at").defaultNow(),
});

export const devisLignes = pgTable("devis_lignes", {
  id: serial("id").primaryKey(),
  devisId: integer("devis_id").notNull(),
  section: text("section").notNull(),
  designation: text("designation").notNull(),
  detail: text("detail").default(""),
  unite: text("unite").notNull().default("u"),
  quantite: real("quantite").notNull().default(1),
  prixUnitaire: integer("prix_unitaire").notNull().default(0),
  ordre: integer("ordre").notNull().default(0),
});

export const factures = pgTable("factures", {
  id: serial("id").primaryKey(),
  devisId: integer("devis_id").notNull(),
  numero: text("numero").notNull(),
  type: text("type").notNull().default("acompte"),
  pct: real("pct").notNull().default(30),
  totalDevisTTC: integer("total_devis_ttc").notNull().default(0),
  montant: integer("montant").notNull().default(0),
  dejaFacture: integer("deja_facture").notNull().default(0),
  soldeRestant: integer("solde_restant").notNull().default(0),
  statut: text("statut").notNull().default("emise"), // emise | payee | annulee
  createdAt: timestamp("created_at").defaultNow(),
});

export const activations = pgTable("activations", {
  id: serial("id").primaryKey(),
  entrepriseId: integer("entreprise_id").notNull(),
  email: text("email").default(""),
  offre: text("offre").notNull(), // unique | pack5 | illimite
  offreLabel: text("offre_label").default(""),
  montant: integer("montant").notNull().default(0),
  moyen: text("moyen").notNull(), // Wave | Orange Money
  transactionId: text("transaction_id").notNull(),
  telephone: text("telephone").default(""),
  creditsAjoutes: integer("credits_ajoutes").notNull().default(0),
  planAvant: text("plan_avant").default("gratuit"),
  creditsAvant: integer("credits_avant").notNull().default(0),
  statut: text("statut").notNull().default("active"), // active (à vérifier) | validee | rejetee
  createdAt: timestamp("created_at").defaultNow(),
  decidedAt: timestamp("decided_at"),
});

export const synchronisations = pgTable("synchronisations", {
  id: serial("id").primaryKey(),
  sens: text("sens").notNull().default("push"),
  statut: text("statut").notNull().default("succes"),
  detail: text("detail").default(""),
  tables: text("tables").default("[]"),
  startedAt: timestamp("started_at").defaultNow(),
  endedAt: timestamp("ended_at"),
});

export const paiements = pgTable("paiements", {
  id: serial("id").primaryKey(),
  offre: text("offre").notNull(),
  montant: integer("montant").notNull(),
  moyen: text("moyen").notNull(), // Wave | Orange Money
  telephone: text("telephone").default(""),
  creditsAjoutes: integer("credits_ajoutes").notNull().default(0),
  statut: text("statut").notNull().default("reussi"),
  reference: text("reference").default(""),
  createdAt: timestamp("created_at").defaultNow(),
});
