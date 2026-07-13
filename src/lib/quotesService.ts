import { supabase } from './supabaseClient';
import { SavedQuote } from '../types';

interface QuoteRow {
  id: string;
  date: string;
  month: string;
  project_info: SavedQuote['projectInfo'];
  geometry: SavedQuote['geometry'];
  complexity: SavedQuote['complexity'];
  execution: SavedQuote['execution'];
  travel: SavedQuote['travel'];
  meeting: SavedQuote['meeting'];
  markup_percent: number | null;
  gross_return_percent: number | null;
  total_cost: number;
  total_facade_area: number;
  cost_per_m2: number;
  category: SavedQuote['category'];
  status: SavedQuote['status'];
}

function toRow(quote: SavedQuote): QuoteRow {
  return {
    id: quote.id,
    date: quote.date,
    month: quote.month,
    project_info: quote.projectInfo,
    geometry: quote.geometry,
    complexity: quote.complexity,
    execution: quote.execution,
    travel: quote.travel,
    meeting: quote.meeting,
    markup_percent: quote.markupPercent,
    gross_return_percent: quote.grossReturnPercent,
    total_cost: quote.totalCost,
    total_facade_area: quote.totalFacadeArea,
    cost_per_m2: quote.costPerM2,
    category: quote.category,
    status: quote.status,
  };
}

function fromRow(row: QuoteRow): SavedQuote {
  return {
    id: row.id,
    date: row.date,
    month: row.month,
    projectInfo: row.project_info,
    geometry: row.geometry,
    complexity: row.complexity,
    execution: row.execution,
    travel: row.travel,
    meeting: row.meeting,
    markupPercent: row.markup_percent,
    grossReturnPercent: row.gross_return_percent,
    totalCost: row.total_cost,
    totalFacadeArea: row.total_facade_area,
    costPerM2: row.cost_per_m2,
    category: row.category,
    status: row.status,
  };
}

export async function fetchQuotes(): Promise<SavedQuote[]> {
  const { data, error } = await supabase
    .from('quotes')
    .select('*')
    .order('date', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(fromRow);
}

export async function upsertQuotes(quotes: SavedQuote[]): Promise<void> {
  if (quotes.length === 0) return;
  const { error } = await supabase.from('quotes').upsert(quotes.map(toRow));
  if (error) throw error;
}

export async function upsertQuote(quote: SavedQuote): Promise<void> {
  await upsertQuotes([quote]);
}

export async function deleteQuote(id: string): Promise<void> {
  const { error } = await supabase.from('quotes').delete().eq('id', id);
  if (error) throw error;
}
