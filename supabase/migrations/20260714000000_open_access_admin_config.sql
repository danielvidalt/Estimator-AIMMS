-- Open the app up to anonymous visitors (no accounts / no login wall),
-- while keeping the pricing engine config editable only by the admin
-- account.
--
-- Requires "Allow anonymous sign-ins" to be turned on for this project:
-- Supabase Dashboard -> Authentication -> Settings -> Anonymous Sign-Ins.
-- That toggle isn't reachable via SQL, so it has to be flipped manually.
--
-- Anonymous sessions carry role `authenticated` (just with no email), so
-- the existing "to authenticated" policies on quotes/app_state already
-- cover anonymous visitors -- no change needed there. pricing_config is
-- the one table that needs a real per-action split: anyone can read the
-- current pricing config (the calculator needs it to run), but only the
-- admin account can write to it.

drop policy if exists "Authenticated users can access pricing_config" on public.pricing_config;

create policy "Anyone signed in (incl. anonymous) can read pricing_config"
  on public.pricing_config for select
  to authenticated
  using (true);

create policy "Only admin can insert pricing_config"
  on public.pricing_config for insert
  to authenticated
  with check (auth.jwt() ->> 'email' = 'danielvidal.t@gmail.com');

create policy "Only admin can update pricing_config"
  on public.pricing_config for update
  to authenticated
  using (auth.jwt() ->> 'email' = 'danielvidal.t@gmail.com')
  with check (auth.jwt() ->> 'email' = 'danielvidal.t@gmail.com');
