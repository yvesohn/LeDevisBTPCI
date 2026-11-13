-- =====================================================================
-- DevisBTP CI — Schéma Supabase (synchronisation)
-- À exécuter UNE FOIS dans Supabase : Dashboard → SQL Editor → New query
-- Copiez tout ce fichier, puis cliquez « Run ».
-- =====================================================================

create table if not exists public.entreprises (
  id integer primary key,
  nom text not null,
  proprietaire text default '',
  telephone text default '',
  email text,
  ville text,
  adresse text,
  rccm text,
  compte_contribuable text,
  logo_data text default '',
  logo_nom text default '',
  signature_data text default '',
  signature_nom text default '',
  cachet_data text default '',
  cachet_nom text default '',
  role text default 'client',
  bloque boolean default false,
  credits integer default 0,
  plan text default 'gratuit',
  illimite_expire_at timestamptz,
  format_pdf_defaut text default 'general',
  total_devis_generes integer default 0,
  created_at timestamptz default now()
);

create table if not exists public.devis (
  id integer primary key,
  entreprise_id integer not null default 0,
  numero text not null,
  client_nom text not null,
  client_tel text default '',
  lieu text not null,
  nature_travaux text not null,
  surface double precision default 100,
  nb_pieces integer default 4,
  nb_etages integer default 1,
  photo_plan_nom text default '',
  photo_plan_taille text default '',
  statut text default 'brouillon',
  total_ht bigint default 0,
  tva_pct double precision default 18,
  remise_pct double precision default 0,
  main_oeuvre_pct double precision default 30,
  total_materiaux bigint default 0,
  montant_main_oeuvre bigint default 0,
  marge_pct double precision default 0,
  total_materiaux_base bigint default 0,
  montant_marge bigint default 0,
  total_ttc bigint default 0,
  validite_jours integer default 30,
  format_pdf text default 'general',
  mo_mode text default 'pct',
  mo_macons integer default 2,
  mo_manoeuvres integer default 2,
  mo_jours integer default 20,
  mo_taux_macon integer default 7000,
  mo_taux_manoeuvre integer default 4000,
  share_token text,
  signature_client_data text default '',
  signature_client_nom text default '',
  signed_at timestamptz,
  materiaux_client boolean default false,
  total_mo_seule_ttc bigint default 0,
  notes text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.devis_lignes (
  id integer primary key,
  devis_id integer not null,
  section text not null,
  designation text not null,
  detail text default '',
  unite text default 'u',
  quantite double precision default 1,
  prix_unitaire bigint default 0,
  ordre integer default 0
);

create table if not exists public.etapes_planning (
  id integer primary key,
  devis_id integer not null,
  etape text not null,
  duree_jours integer default 1,
  detail text default '',
  ordre integer default 0
);

create table if not exists public.factures (
  id integer primary key,
  devis_id integer not null,
  numero text not null,
  type text default 'acompte',
  pct double precision default 30,
  total_devis_ttc bigint default 0,
  montant bigint default 0,
  deja_facture bigint default 0,
  solde_restant bigint default 0,
  statut text default 'emise',
  created_at timestamptz default now()
);

create table if not exists public.depenses (
  id integer primary key,
  devis_id integer not null,
  libelle text not null,
  montant bigint default 0,
  date_depense text default '',
  created_at timestamptz default now()
);

create table if not exists public.avenants (
  id integer primary key,
  devis_id integer not null,
  numero text not null,
  titre text default 'Travaux supplémentaires',
  description text default '',
  statut text default 'brouillon',
  tva_pct double precision default 18,
  total_ht bigint default 0,
  total_ttc bigint default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.avenant_lignes (
  id integer primary key,
  avenant_id integer not null,
  designation text not null,
  detail text default '',
  unite text default 'u',
  quantite double precision default 1,
  prix_unitaire bigint default 0,
  ordre integer default 0
);

create table if not exists public.activations (
  id integer primary key,
  entreprise_id integer not null,
  email text default '',
  offre text not null,
  offre_label text default '',
  montant bigint default 0,
  moyen text not null,
  transaction_id text not null,
  telephone text default '',
  credits_ajoutes integer default 0,
  plan_avant text default 'gratuit',
  credits_avant integer default 0,
  statut text default 'active',
  created_at timestamptz default now(),
  decided_at timestamptz
);

create table if not exists public.synchronisations (
  id integer primary key,
  sens text default 'push',
  statut text default 'succes',
  detail text default '',
  tables jsonb,
  started_at timestamptz default now(),
  ended_at timestamptz
);

-- Index utiles pour les lectures côté Supabase
create index if not exists devis_entreprise_idx on public.devis (entreprise_id);
create index if not exists devis_lignes_devis_idx on public.devis_lignes (devis_id);
create index if not exists planning_devis_idx on public.etapes_planning (devis_id);
create index if not exists factures_devis_idx on public.factures (devis_id);
create index if not exists depenses_devis_idx on public.depenses (devis_id);
create index if not exists avenants_devis_idx on public.avenants (devis_id);

-- ---------------------------------------------------------------------
-- Droits d'accès pour la clé « publishable » (rôle anon)
-- La clé publishable est utilisée UNIQUEMENT par le serveur DevisBTP CI.
-- Pour un déploiement public, remplacez-la par la clé secrète (service_role)
-- et supprimez les politiques ci-dessous.
-- ---------------------------------------------------------------------
alter table public.entreprises enable row level security;
alter table public.devis enable row level security;
alter table public.devis_lignes enable row level security;
alter table public.etapes_planning enable row level security;
alter table public.factures enable row level security;
alter table public.depenses enable row level security;
alter table public.avenants enable row level security;
alter table public.avenant_lignes enable row level security;
alter table public.activations enable row level security;
alter table public.synchronisations enable row level security;

do $$
declare t text;
begin
  foreach t in array array['entreprises','devis','devis_lignes','etapes_planning','factures','depenses','avenants','avenant_lignes','activations','synchronisations']
  loop
    execute format('drop policy if exists devisbtp_sync_all on public.%I', t);
    execute format('create policy devisbtp_sync_all on public.%I for all to anon, authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- Recharge le cache de schéma de l'API REST
notify pgrst, 'reload schema';
