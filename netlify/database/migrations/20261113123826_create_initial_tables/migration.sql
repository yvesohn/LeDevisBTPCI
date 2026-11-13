CREATE TABLE "activations" (
	"id" serial PRIMARY KEY,
	"entreprise_id" integer NOT NULL,
	"email" text DEFAULT '',
	"offre" text NOT NULL,
	"offre_label" text DEFAULT '',
	"montant" integer DEFAULT 0 NOT NULL,
	"moyen" text NOT NULL,
	"transaction_id" text NOT NULL,
	"telephone" text DEFAULT '',
	"credits_ajoutes" integer DEFAULT 0 NOT NULL,
	"plan_avant" text DEFAULT 'gratuit',
	"credits_avant" integer DEFAULT 0 NOT NULL,
	"statut" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"decided_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "avenant_lignes" (
	"id" serial PRIMARY KEY,
	"avenant_id" integer NOT NULL,
	"designation" text NOT NULL,
	"detail" text DEFAULT '',
	"unite" text DEFAULT 'u' NOT NULL,
	"quantite" real DEFAULT 1 NOT NULL,
	"prix_unitaire" integer DEFAULT 0 NOT NULL,
	"ordre" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "avenants" (
	"id" serial PRIMARY KEY,
	"devis_id" integer NOT NULL,
	"numero" text NOT NULL,
	"titre" text DEFAULT 'Travaux supplémentaires' NOT NULL,
	"description" text DEFAULT '',
	"statut" text DEFAULT 'brouillon' NOT NULL,
	"tva_pct" real DEFAULT 18 NOT NULL,
	"total_ht" integer DEFAULT 0 NOT NULL,
	"total_ttc" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "depenses" (
	"id" serial PRIMARY KEY,
	"devis_id" integer NOT NULL,
	"libelle" text NOT NULL,
	"montant" integer DEFAULT 0 NOT NULL,
	"date_depense" text DEFAULT '',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "devis" (
	"id" serial PRIMARY KEY,
	"entreprise_id" integer DEFAULT 0 NOT NULL,
	"numero" text NOT NULL,
	"client_nom" text NOT NULL,
	"client_tel" text DEFAULT '',
	"lieu" text NOT NULL,
	"nature_travaux" text NOT NULL,
	"surface" real DEFAULT 100,
	"nb_pieces" integer DEFAULT 4,
	"nb_etages" integer DEFAULT 1,
	"photo_plan_nom" text DEFAULT '',
	"photo_plan_taille" text DEFAULT '',
	"statut" text DEFAULT 'brouillon' NOT NULL,
	"total_ht" integer DEFAULT 0 NOT NULL,
	"tva_pct" real DEFAULT 18 NOT NULL,
	"remise_pct" real DEFAULT 0 NOT NULL,
	"main_oeuvre_pct" real DEFAULT 30 NOT NULL,
	"total_materiaux" integer DEFAULT 0 NOT NULL,
	"montant_main_oeuvre" integer DEFAULT 0 NOT NULL,
	"marge_pct" real DEFAULT 0 NOT NULL,
	"total_materiaux_base" integer DEFAULT 0 NOT NULL,
	"montant_marge" integer DEFAULT 0 NOT NULL,
	"total_ttc" integer DEFAULT 0 NOT NULL,
	"validite_jours" integer DEFAULT 30 NOT NULL,
	"format_pdf" text DEFAULT 'general' NOT NULL,
	"mo_mode" text DEFAULT 'pct' NOT NULL,
	"mo_macons" integer DEFAULT 2 NOT NULL,
	"mo_manoeuvres" integer DEFAULT 2 NOT NULL,
	"mo_jours" integer DEFAULT 20 NOT NULL,
	"mo_taux_macon" integer DEFAULT 7000 NOT NULL,
	"mo_taux_manoeuvre" integer DEFAULT 4000 NOT NULL,
	"share_token" text,
	"signature_client_data" text DEFAULT '',
	"signature_client_nom" text DEFAULT '',
	"signed_at" timestamp,
	"materiaux_client" boolean DEFAULT false NOT NULL,
	"total_mo_seule_ttc" integer DEFAULT 0 NOT NULL,
	"notes" text DEFAULT '',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "devis_lignes" (
	"id" serial PRIMARY KEY,
	"devis_id" integer NOT NULL,
	"section" text NOT NULL,
	"designation" text NOT NULL,
	"detail" text DEFAULT '',
	"unite" text DEFAULT 'u' NOT NULL,
	"quantite" real DEFAULT 1 NOT NULL,
	"prix_unitaire" integer DEFAULT 0 NOT NULL,
	"ordre" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entreprises" (
	"id" serial PRIMARY KEY,
	"nom" text DEFAULT 'SARL Bâtir Ivoire' NOT NULL,
	"proprietaire" text DEFAULT 'Kouadio Yao' NOT NULL,
	"telephone" text DEFAULT '+225 07 07 12 34 56' NOT NULL,
	"email" text DEFAULT 'contact@batir-ivoire.ci',
	"ville" text DEFAULT 'Abidjan, Cocody',
	"adresse" text DEFAULT '',
	"rccm" text,
	"compte_contribuable" text,
	"logo_data" text DEFAULT '',
	"logo_nom" text DEFAULT '',
	"signature_data" text DEFAULT '',
	"signature_nom" text DEFAULT '',
	"cachet_data" text DEFAULT '',
	"cachet_nom" text DEFAULT '',
	"password_hash" text DEFAULT '' NOT NULL,
	"role" text DEFAULT 'client' NOT NULL,
	"format_pdf_defaut" text DEFAULT 'general' NOT NULL,
	"bloque" boolean DEFAULT false NOT NULL,
	"credits" integer DEFAULT 1 NOT NULL,
	"plan" text DEFAULT 'gratuit' NOT NULL,
	"illimite_expire_at" timestamp,
	"total_devis_generes" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "etapes_planning" (
	"id" serial PRIMARY KEY,
	"devis_id" integer NOT NULL,
	"etape" text NOT NULL,
	"duree_jours" integer DEFAULT 1 NOT NULL,
	"detail" text DEFAULT '',
	"ordre" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "factures" (
	"id" serial PRIMARY KEY,
	"devis_id" integer NOT NULL,
	"numero" text NOT NULL,
	"type" text DEFAULT 'acompte' NOT NULL,
	"pct" real DEFAULT 30 NOT NULL,
	"total_devis_ttc" integer DEFAULT 0 NOT NULL,
	"montant" integer DEFAULT 0 NOT NULL,
	"deja_facture" integer DEFAULT 0 NOT NULL,
	"solde_restant" integer DEFAULT 0 NOT NULL,
	"statut" text DEFAULT 'emise' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "paiements" (
	"id" serial PRIMARY KEY,
	"offre" text NOT NULL,
	"montant" integer NOT NULL,
	"moyen" text NOT NULL,
	"telephone" text DEFAULT '',
	"credits_ajoutes" integer DEFAULT 0 NOT NULL,
	"statut" text DEFAULT 'reussi' NOT NULL,
	"reference" text DEFAULT '',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"token" text PRIMARY KEY,
	"entreprise_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "synchronisations" (
	"id" serial PRIMARY KEY,
	"sens" text DEFAULT 'push' NOT NULL,
	"statut" text DEFAULT 'succes' NOT NULL,
	"detail" text DEFAULT '',
	"tables" text DEFAULT '[]',
	"started_at" timestamp DEFAULT now(),
	"ended_at" timestamp
);
