import { actionTypes } from '@/ontology';
import { actionRoute, ActionError } from '@/lib/http/action-route';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { appToday } from '@/lib/clock';
import { startOvernightIfDue, type Overnight } from '@/lib/overnight';
import { FEEDBACK_VIEW } from '@/lib/feedback';
import { readGrowItems } from '@/lib/grow-items';
import type { GrowResponse } from '@/contract';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const QUIET: Overnight = { day: null, decision: 'settled', runStatus: null };

/**
 * Grow: what Yini suggests you could do for the two of you. Everything that does not
 * depend on anything else is fetched at once, and a read of the day is only ever
 * started (after this response), never waited on.
 */
export const GET = actionRoute(actionTypes.getGrow, async ({ user, supabase }): Promise<GrowResponse> => {
  const db = createAdminSupabase();
  const { data: me } = await db.from('profiles').select('timezone, default_connection_id').eq('id', user.id).single();
  const connectionId = me?.default_connection_id;
  if (!me || !connectionId) throw new ActionError('no_connection', 'Not connected yet', 400, false);

  const today = await appToday(me.timezone);
  let problem: string | null = null;

  // The overnight check runs alongside the reads. If it breaks (a table missing, the
  // database unreachable) the page still opens with what was already written, and says why.
  const overnightP = startOvernightIfDue(db, connectionId, today).catch((e: Error) => {
    problem = e.message;
    console.error('[grow] could not check for an unread day:', e.message);
    return QUIET;
  });

  // Feedback and nudges go through the user's own client: RLS (recipient_id = auth.uid()) is the filter.
  const [fb, needs, doneRows, members, items, overnight] = await Promise.all([
    supabase.from('daily_feedback').select(FEEDBACK_VIEW).order('local_date', { ascending: false }).limit(14),
    supabase.from('nudges').select('id, kind, body_text, delivered_on')
      .in('kind', ['partner_need', 'partner_context']).order('delivered_on', { ascending: false }).limit(10),
    db.from('grow_done').select('id, body_text, done_at').eq('recipient_id', user.id).eq('status', 'done').order('done_at', { ascending: false }).limit(60),
    db.from('connection_members').select('user_id, profiles(display_name)').eq('connection_id', connectionId),
    readGrowItems(db, user.id),
    overnightP,
  ]);
  if (fb.error) {
    console.error('[grow] could not read daily_feedback:', fb.error.message);
    throw new ActionError('server_error', `Could not read your Grow notes: ${fb.error.message}`, 500);
  }
  const feedback = fb.data ?? [];
  const fromPartner = (needs.data ?? []) as GrowResponse['from_partner'];
  // A missing grow_done table must not take Grow down with it: nothing is simply not done yet.
  const done = (doneRows.error ? [] : doneRows.data ?? []).map((r) => ({ id: r.id, text: r.body_text, done_at: r.done_at }));
  const partner = (members.data ?? []).find((m) => m.user_id !== user.id)?.profiles as unknown as { display_name: string } | undefined;

  // working: a read is due or underway. failed: the last read broke and is cooling off.
  // ready: there is something to show. waiting: today is logged but nothing has come of it yet. empty: nothing logged.
  let state: GrowResponse['status'] = 'empty';
  if (overnight.day !== null && overnight.decision !== 'settled') state = 'working';
  else if (problem || (overnight.day !== null && overnight.runStatus === 'failed')) state = 'failed';
  else if (feedback.length || fromPartner.length) state = 'ready';
  else if (overnight.day !== null) state = 'waiting';

  return {
    partner_display_name: partner?.display_name ?? 'Your person',
    status: state,
    feedback,
    from_partner: fromPartner,
    done,
    items,
    problem,
  };
});
