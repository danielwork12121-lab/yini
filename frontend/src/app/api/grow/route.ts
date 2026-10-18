import { actionTypes } from '@/ontology';
import { actionRoute, ActionError } from '@/lib/http/action-route';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { getConnectionStatus } from '@/lib/connection-status';
import { appToday } from '@/lib/clock';
import { startOvernightIfDue, type Overnight } from '@/lib/overnight';
import { FEEDBACK_VIEW } from '@/lib/feedback';
import type { GrowResponse } from '@/contract';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export const GET = actionRoute(actionTypes.getGrow, async ({ user, supabase }): Promise<GrowResponse> => {
  const db = createAdminSupabase();
  const { data: me } = await db.from('profiles').select('timezone, default_connection_id').eq('id', user.id).single();
  const connectionId = me?.default_connection_id;
  if (!me || !connectionId) throw new ActionError('no_connection', 'Not connected yet', 400, false);

  // A finished day nobody has read yet gets read now, after this response is sent.
  // If that check itself breaks (a table missing, the database unreachable) the page still
  // opens, with whatever was already written, and says what went wrong.
  const today = await appToday(me.timezone);
  let problem: string | null = null;
  let overnight: Overnight = { day: null, decision: 'settled', runStatus: null };
  try {
    overnight = await startOvernightIfDue(db, connectionId, today);
  } catch (e) {
    problem = (e as Error).message;
    console.error('[grow] could not check for an unread day:', problem);
  }

  // Both lists go through the user's own client: RLS (recipient_id = auth.uid()) is the filter.
  const [fb, needs, conn, logged] = await Promise.all([
    supabase.from('daily_feedback').select(FEEDBACK_VIEW).order('local_date', { ascending: false }).limit(14),
    supabase.from('nudges').select('id, kind, body_text, delivered_on')
      .in('kind', ['partner_need', 'partner_context']).order('delivered_on', { ascending: false }).limit(10),
    getConnectionStatus(user.id),
    supabase.from('entries').select('id', { count: 'exact', head: true }).eq('local_date', today),
  ]);
  if (fb.error) {
    console.error('[grow] could not read daily_feedback:', fb.error.message);
    throw new ActionError('server_error', `Could not read your Grow notes: ${fb.error.message}`, 500);
  }
  const feedback = fb.data ?? [];
  const fromPartner = (needs.data ?? []) as GrowResponse['from_partner'];

  // working: a finished day is being read. failed: the last read broke and is cooling off.
  // ready: there is something to show, or a day was read and had nothing to say. empty: nothing logged yet.
  let state: GrowResponse['status'] = 'empty';
  if (overnight.day !== null && overnight.decision !== 'settled') state = 'working';
  else if (problem || (overnight.day !== null && overnight.runStatus === 'failed')) state = 'failed';
  else if (feedback.length || fromPartner.length || overnight.day !== null) state = 'ready';
  else if ((logged.count ?? 0) > 0) state = 'waiting';

  return {
    partner_display_name: conn.partner_display_name ?? 'Your person',
    status: state,
    feedback,
    from_partner: fromPartner,
    problem,
  };
});
