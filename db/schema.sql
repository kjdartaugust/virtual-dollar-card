-- Dola — Neon Postgres schema (real backend).
-- Apply with: psql "$DATABASE_URL" -f db/schema.sql   (or paste into the Neon SQL editor)
-- Access control is enforced in the Next.js API routes via a signed JWT session,
-- so no RLS is required here (unlike the Supabase variant in supabase/schema.sql).

create extension if not exists pgcrypto;

create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  password_hash text not null,
  full_name     text not null,
  phone         text,
  country       text not null default 'Ghana',
  created_at    timestamptz not null default now()
);

do $$ begin
  create type kyc_status as enum ('unverified','pending','verified','rejected');
exception when duplicate_object then null; end $$;

create table if not exists kyc (
  user_id          uuid primary key references users(id) on delete cascade,
  status           kyc_status not null default 'unverified',
  id_type          text,
  id_number        text,
  date_of_birth    date,
  address          text,
  city             text,
  submitted_at     timestamptz,
  reviewed_at      timestamptz,
  rejection_reason text
);

create table if not exists wallets (
  user_id     uuid primary key references users(id) on delete cascade,
  usd_balance numeric(14,2) not null default 0,
  currency    text not null default 'USD'
);

do $$ begin
  create type card_status as enum ('active','frozen','terminated');
exception when duplicate_object then null; end $$;

create table if not exists cards (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references users(id) on delete cascade,
  provider_ref text not null,
  brand        text not null,
  label        text not null,
  last4        text not null,
  exp_month    int not null,
  exp_year     int not null,
  cardholder   text not null,
  balance      numeric(14,2) not null default 0,
  status       card_status not null default 'active',
  color        text not null default 'aurora',
  created_at   timestamptz not null default now()
);

-- Sensitive card data kept in a separate table to model PCI isolation. In
-- production these never touch your DB — they live with the issuer and are
-- fetched via a tokenized reveal. Here they hold non-routable test values only.
create table if not exists card_secrets (
  card_id uuid primary key references cards(id) on delete cascade,
  pan     text not null,
  cvv     text not null
);

create table if not exists transactions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references users(id) on delete cascade,
  card_id      uuid references cards(id) on delete set null,
  type         text not null,
  status       text not null,
  amount_usd   numeric(14,2) not null,
  amount_ghs   numeric(14,2),
  rate         numeric(10,4),
  fee          numeric(14,2),
  merchant     text,
  card_last4   text,
  reference    text not null unique,
  note         text,
  created_at   timestamptz not null default now()
);

-- Paystack funding attempts. `reference` is Paystack's transaction reference;
-- the unique constraint makes crediting idempotent (webhook + callback can't
-- double-credit the same payment).
create table if not exists payments (
  reference   text primary key,
  user_id     uuid not null references users(id) on delete cascade,
  amount_ghs  numeric(14,2) not null,
  amount_usd  numeric(14,2) not null,
  rate        numeric(10,4) not null,
  method      text,
  status      text not null default 'pending',
  credited    boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists transactions_user_created_idx on transactions (user_id, created_at desc);
create index if not exists cards_user_idx on cards (user_id);
create index if not exists payments_user_idx on payments (user_id);
