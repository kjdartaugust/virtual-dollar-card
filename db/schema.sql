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
  -- Cardholder id at the issuer (Sudo customer), created once and reused so we
  -- don't mint a new provider cardholder for every card.
  provider_customer_id text,
  created_at    timestamptz not null default now()
);
alter table users add column if not exists provider_customer_id text;

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

-- Spending controls the authorization gateway enforces (monthly limit, blocked
-- merchant categories, allowed channels). Null = the card's defaults.
alter table cards add column if not exists spending_controls jsonb;

create index if not exists transactions_user_created_idx on transactions (user_id, created_at desc);
create index if not exists cards_user_idx on cards (user_id);
create index if not exists payments_user_idx on payments (user_id);
-- The gateway looks a card up by provider ref on every authorization, and sums
-- month-to-date spend on a card — both are hot paths inside a 4s budget.
create index if not exists cards_provider_ref_idx on cards (provider_ref);
create index if not exists transactions_card_created_idx on transactions (card_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Susu — rotating savings circles and personal savings goals (the native app).
-- Amounts are stored in GHS (the susu app's base currency); display conversion
-- to USD stays client-side. Members can be plain names now and get linked to a
-- real Dola user when invites land (see circle_members.user_id).
-- ---------------------------------------------------------------------------

create table if not exists circles (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references users(id) on delete cascade,
  name         text not null,
  contribution numeric(14,2) not null,            -- GHS per member, per cycle
  frequency    text not null default 'monthly',   -- weekly | biweekly | monthly
  start_date   date not null,
  created_at   timestamptz not null default now()
);

create table if not exists circle_members (
  id         uuid primary key default gen_random_uuid(),
  circle_id  uuid not null references circles(id) on delete cascade,
  position   int not null,                        -- payout order, 0-based
  name       text not null,                       -- display name
  -- Set once this slot is claimed by a real user (invite flow, step 4).
  -- Null = a placeholder the organizer typed in.
  user_id    uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (circle_id, position)
);

-- Presence of a row = that member paid that cycle; absence = unpaid.
create table if not exists circle_payments (
  circle_id   uuid not null references circles(id) on delete cascade,
  member_id   uuid not null references circle_members(id) on delete cascade,
  cycle_index int not null,
  paid_at     timestamptz not null default now(),
  primary key (circle_id, member_id, cycle_index)
);

create table if not exists goals (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  name       text not null,
  target     numeric(14,2) not null,              -- GHS
  created_at timestamptz not null default now()
);

create table if not exists goal_txns (
  id         uuid primary key default gen_random_uuid(),
  goal_id    uuid not null references goals(id) on delete cascade,
  amount     numeric(14,2) not null,              -- GHS, + deposit / - withdrawal
  note       text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists circles_owner_idx on circles (owner_id);
create index if not exists circle_members_circle_idx on circle_members (circle_id);
create index if not exists circle_members_user_idx on circle_members (user_id);
create index if not exists goals_user_idx on goals (user_id);
create index if not exists goal_txns_goal_idx on goal_txns (goal_id);
