-- AIMMS Estimator: editable pricing engine parameters (Settings tab)
-- Run this once in the Supabase SQL Editor (or via `supabase db push`).

create table if not exists public.pricing_config (
  id text primary key,
  config jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.pricing_config enable row level security;

drop policy if exists "Authenticated users can access pricing_config" on public.pricing_config;
create policy "Authenticated users can access pricing_config"
  on public.pricing_config for all
  to authenticated
  using (true)
  with check (true);
