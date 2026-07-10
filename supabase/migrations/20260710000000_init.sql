-- AIMMS Estimator: quotes history + current draft state
-- Run this once in the Supabase SQL Editor (or via `supabase db push`).

create table if not exists public.quotes (
  id text primary key,
  date date not null,
  month text not null,
  project_info jsonb not null,
  geometry jsonb not null,
  complexity jsonb not null,
  execution jsonb not null,
  travel jsonb not null,
  meeting jsonb not null,
  profit_margin_percent numeric not null,
  margin_method text,
  total_cost numeric not null,
  profit_amount numeric not null,
  subtotal numeric not null,
  final_price numeric not null,
  total_facade_area numeric not null,
  cost_per_m2 numeric not null,
  sell_price_per_m2 numeric not null,
  final_rate_per_m2 numeric not null,
  category text not null,
  status text not null default 'Quoted',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_state (
  id text primary key,
  current_draft jsonb,
  custom_prelims numeric,
  updated_at timestamptz not null default now()
);

alter table public.quotes enable row level security;
alter table public.app_state enable row level security;

-- No auth/login exists in this app yet, so the anon key needs full read/write
-- access to function. Anyone with the public anon key (visible in the deployed
-- app's JS bundle) can read/write these tables. Tighten these policies (e.g.
-- scope by auth.uid()) once user accounts are introduced.
drop policy if exists "Allow anon full access to quotes" on public.quotes;
create policy "Allow anon full access to quotes"
  on public.quotes for all
  using (true)
  with check (true);

drop policy if exists "Allow anon full access to app_state" on public.app_state;
create policy "Allow anon full access to app_state"
  on public.app_state for all
  using (true)
  with check (true);
