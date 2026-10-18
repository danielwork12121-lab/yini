import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { GrowItemView } from '@/contract';

export const GROW_ITEM_COLUMNS = 'body_text, saved, status, outcome, reflection, done_at';

type Row = { body_text: string; saved: boolean; status: 'done' | 'skipped' | null; outcome: GrowItemView['outcome']; reflection: string | null; done_at: string | null };

export const toItemView = (r: Row): GrowItemView => ({
  text: r.body_text, saved: r.saved, status: r.status, outcome: r.outcome, reflection: r.reflection, done_at: r.done_at,
});

/** Everything this person has bookmarked, done, skipped or reflected on. A missing column or table simply means nothing yet. */
export async function readGrowItems(db: SupabaseClient, userId: string): Promise<GrowItemView[]> {
  const { data, error } = await db.from('grow_done').select(GROW_ITEM_COLUMNS)
    .eq('recipient_id', userId).order('updated_at', { ascending: false }).limit(120);
  if (error) { console.error('[grow] could not read grow_done:', error.message); return []; }
  return ((data ?? []) as Row[]).map(toItemView);
}
