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

-- Team tool, shared data: any signed-in user (regardless of who) can read
-- and write every quote and the shared draft. There is no per-user scoping
-- by design (the 3 team members share one history log). Anonymous
-- (unauthenticated) requests are rejected.
drop policy if exists "Allow anon full access to quotes" on public.quotes;
drop policy if exists "Authenticated users can access quotes" on public.quotes;
create policy "Authenticated users can access quotes"
  on public.quotes for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Allow anon full access to app_state" on public.app_state;
drop policy if exists "Authenticated users can access app_state" on public.app_state;
create policy "Authenticated users can access app_state"
  on public.app_state for all
  to authenticated
  using (true)
  with check (true);
