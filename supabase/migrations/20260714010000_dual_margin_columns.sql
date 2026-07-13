-- Estimates can now carry an independent Markup % and/or Gross Return %
-- (either, both, or neither), instead of a single profit_margin_percent +
-- margin_method pair. Subtotal/GST/Final Price/rates for each are no longer
-- stored -- they're derived on demand from total_cost + cost_per_m2 +
-- total_facade_area (see computeScenario() in src/utils/calculator.ts).
--
-- Additive migration: old columns (profit_margin_percent, margin_method,
-- profit_amount, subtotal, final_price, sell_price_per_m2, final_rate_per_m2)
-- are left in place, unused, rather than dropped -- so this is safe to run
-- without losing data, and existing rows are backfilled below.

alter table public.quotes
  add column if not exists markup_percent numeric,
  add column if not exists gross_return_percent numeric;

update public.quotes
set
  markup_percent = case when margin_method = 'gross' then null else profit_margin_percent end,
  gross_return_percent = case when margin_method = 'gross' then profit_margin_percent else null end
where markup_percent is null and gross_return_percent is null;
