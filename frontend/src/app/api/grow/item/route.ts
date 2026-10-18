import { actionTypes } from '@/ontology';
import { actionRoute, ActionError } from '@/lib/http/action-route';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { appToday } from '@/lib/clock';
import { readGrowItems } from '@/lib/grow-items';
import type { GrowItemResponse } from '@/contract';

export const dynamic = 'force-dynamic';

/** Bookmark, do, skip or reflect on one of your own Grow suggestions. Send only what changes. */
export const POST = actionRoute(actionTypes.updateGrowItem, async ({ input, user, supabase }): Promise<GrowItemResponse> => {
  const db = createAdminSupabase();
  const { data: me } = await db.from('profiles').select('timezone, default_connection_id').eq('id', user.id).single();
  if (!me?.default_connection_id) throw new ActionError('no_connection', 'Not connected yet', 400, false);

  const { data: existing, error: readErr } = await db.from('grow_done').select('id, saved, status')
    .eq('recipient_id', user.id).eq('body_text', input.text).maybeSingle();
  if (readErr) throw new ActionError('server_error', readErr.message, 500);

  // Only one of this person's own suggestions can be touched. RLS limits these rows to their own.
  // Checked here rather than with a PostgREST array filter, which mis-encodes commas and quotes.
  const taking = input.saved === true || input.status === 'done' || input.status === 'skipped';
  if (!existing && taking) {
    const { data: rows, error } = await supabase.from('daily_feedback').select('bullets').order('local_date', { ascending: false }).limit(60);
    if (error) throw new ActionError('server_error', error.message, 500);
    if (!(rows ?? []).some((r) => (r.bullets as string[]).includes(input.text))) {
      throw new ActionError('invalid_input', 'That is not one of your suggestions', 400);
    }
  }
  if (!existing && !taking) return { items: await readGrowItems(db, user.id) }; // nothing to take back

  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { updated_at: now };
  if (input.saved !== undefined) patch.saved = input.saved;
  if (input.status === 'open') {
    Object.assign(patch, { status: null, outcome: null, reflection: null, done_at: null, done_on: null });
  } else if (input.status) {
    Object.assign(patch, { status: input.status, done_at: now, done_on: await appToday(me.timezone) });
  }
  if (input.outcome !== undefined) patch.outcome = input.outcome;
  if (input.reflection !== undefined) patch.reflection = input.reflection?.trim() ? input.reflection.trim() : null;

  const write = existing
    ? await db.from('grow_done').update(patch).eq('id', existing.id)
    : await db.from('grow_done').insert({ recipient_id: user.id, connection_id: me.default_connection_id, body_text: input.text, saved: false, ...patch });
  if (write.error) throw new ActionError('server_error', write.error.message, 500);

  // A row with nothing left on it is deleted, so the table holds only things someone touched.
  const saved = input.saved ?? existing?.saved ?? false;
  const status = input.status === 'open' ? null : input.status ?? existing?.status ?? null;
  if (!saved && !status) await db.from('grow_done').delete().eq('recipient_id', user.id).eq('body_text', input.text);

  return { items: await readGrowItems(db, user.id) };
});
