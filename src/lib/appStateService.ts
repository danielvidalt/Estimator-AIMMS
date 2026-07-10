import { supabase } from './supabaseClient';
import { EstimateInputs } from '../types';

// Single-user app (no auth yet): draft state lives in one fixed row.
const STATE_ROW_ID = 'singleton';

interface AppStateRow {
  current_draft: EstimateInputs | null;
  custom_prelims: number | null;
}

export async function fetchAppState(): Promise<{
  draft: EstimateInputs | null;
  customPrelims: number | null;
}> {
  const { data, error } = await supabase
    .from('app_state')
    .select('current_draft, custom_prelims')
    .eq('id', STATE_ROW_ID)
    .maybeSingle<AppStateRow>();
  if (error) throw error;
  return {
    draft: data?.current_draft ?? null,
    customPrelims: data?.custom_prelims ?? null,
  };
}

export async function saveAppState(
  draft: EstimateInputs,
  customPrelims: number
): Promise<void> {
  const { error } = await supabase.from('app_state').upsert({
    id: STATE_ROW_ID,
    current_draft: draft,
    custom_prelims: customPrelims,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}
