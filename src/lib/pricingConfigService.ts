import { supabase } from './supabaseClient';
import { PricingConfig } from '../types';

// Single shared config for the whole team (no per-user scoping): one fixed row.
const CONFIG_ROW_ID = 'singleton';

export async function fetchPricingConfig(): Promise<PricingConfig | null> {
  const { data, error } = await supabase
    .from('pricing_config')
    .select('config')
    .eq('id', CONFIG_ROW_ID)
    .maybeSingle<{ config: PricingConfig }>();
  if (error) throw error;
  return data?.config ?? null;
}

export async function savePricingConfig(config: PricingConfig): Promise<void> {
  const { error } = await supabase.from('pricing_config').upsert({
    id: CONFIG_ROW_ID,
    config,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}
