import { actionTypes } from '@/ontology';
import { actionRoute, ActionError } from '@/lib/http/action-route';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { appToday } from '@/lib/clock';
import type { GrowDoneResponse } from '@/contract';

export const dynamic = 'force-dynamic';

/** Tick a Grow suggestion off, or take it back. Returns the whole done list, newest first. */
export const POST = actionRoute(actionTypes.setGrowDone, async ({ input, user, supabase }): Promise<GrowDoneResponse> => {
  const db = createAdminSupabase();

  if (input.done) {
    // Only one of this person's own suggestions can be ticked off. RLS limits these rows to their own.
    // Checked here rather than with a PostgREST array filter, which mis-encodes commas and quotes.
    const { data: rows, error } = await supabase.from('daily_feedback').select('bullets').order('local_date', { ascending: false }).limit(60);
    if (error) throw new ActionError('server_error', error.message, 500);
    if (!(rows ?? []).some((r) => (r.bullets as string[]).includes(input.text))) {
      throw new ActionError('invalid_input', 'That is not one of your suggestions', 400);
    }
    const { data: me } = await db.from('profiles').select('timezone, default_connection_id').eq('id', user.id).single();
    if (!me?.default_connection_id) throw new ActionError('no_connection', 'Not connected yet', 400, false);
    const now = new Date().toISOString();
    const { data: had } = await db.from('grow_done').select('id').eq('recipient_id', user.id).eq('body_text', input.text).maybeSingle();
    const mark = { status: 'done', done_at: now, done_on: await appToday(me.timezone), updated_at: now };
    const up = had
      ? await db.from('grow_done').update(mark).eq('id', had.id)
      : await db.from('grow_done').insert({ recipient_id: user.id, connection_id: me.default_connection_id, body_text: input.text, ...mark });
    if (up.error) throw new ActionError('server_error', up.error.message, 500);
  } else {
    const clear = await db.from('grow_done').update({ status: null, outcome: null, reflection: null, done_at: null, done_on: null, updated_at: new Date().toISOString() })
      .eq('recipient_id', user.id).eq('body_text', input.text);
    if (clear.error) throw new ActionError('server_error', clear.error.message, 500);
    await db.from('grow_done').delete().eq('recipient_id', user.id).eq('body_text', input.text).eq('saved', false).is('status', null);
  }

  const { data, error } = await db.from('grow_done').select('id, body_text, done_at')
    .eq('recipient_id', user.id).eq('status', 'done').order('done_at', { ascending: false }).limit(60);
  if (error) throw new ActionError('server_error', error.message, 500);
  return { done: (data ?? []).map((r) => ({ id: r.id, text: r.body_text, done_at: r.done_at as string })) };
});
