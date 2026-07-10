-- Dola — production data model (the migration path from local demo storage).
-- Apply in the Supabase SQL editor. Row-level security scopes every row to its owner.

create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  country text not null default 'Ghana',
  created_at timestamptz not null default now()
);

create type kyc_status as enum ('unverified', 'pending', 'verified', 'rejected');

create table if not exists kyc (
  user_id uuid primary key references auth.users on delete cascade,
  status kyc_status not null default 'unverified',
  id_type text,
  id_number text,
  date_of_birth date,
  address text,
  city text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  rejection_reason text
);

create table if not exists wallets (
  user_id uuid primary key references auth.users on delete cascade,
  usd_balance numeric(14, 2) not null default 0,
  currency text not null default 'USD'
);

create type card_status as enum ('active', 'frozen', 'terminated');

create table if not exists cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  provider_ref text not null,
  brand text not null,
  label text not null,
  last4 text not null,
  exp_month int not null,
  exp_year int not null,
  cardholder text not null,
  balance numeric(14, 2) not null default 0,
  status card_status not null default 'active',
  color text not null default 'aurora',
  created_at timestamptz not null default now()
  -- NOTE: full PAN/CVV are never stored here in production; they live only with
  -- the PCI-DSS-compliant issuer and are fetched on demand via a tokenized reveal.
);

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  card_id uuid references cards on delete set null,
  type text not null,
  status text not null,
  amount_usd numeric(14, 2) not null,
  amount_ghs numeric(14, 2),
  rate numeric(10, 4),
  fee numeric(14, 2),
  merchant text,
  card_last4 text,
  reference text not null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists transactions_user_created_idx
  on transactions (user_id, created_at desc);
create index if not exists cards_user_idx on cards (user_id);

-- Row-level security
alter table profiles enable row level security;
alter table kyc enable row level security;
alter table wallets enable row level security;
alter table cards enable row level security;
alter table transactions enable row level security;

create policy "own profile" on profiles for all
  using (auth.uid() = id) with check (auth.uid() = id);
create policy "own kyc" on kyc for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own wallet" on wallets for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own cards" on cards for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own transactions" on transactions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
