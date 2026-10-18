import { actionTypes } from '@/ontology';
import { actionRoute, ActionError } from '@/lib/http/action-route';
import { createAdminSupabase } from '@/lib/supabase/admin';

export const POST = actionRoute(actionTypes.joinConnection, async ({ input, user }) => {
  const db = createAdminSupabase();
  const { data: conn } = await db.from('connections').select('id').eq('invite_code', input.invite_code).maybeSingle();
  if (!conn) throw new ActionError('not_found', 'No connection with that code. Check it with your partner.', 404);

  const { data: members } = await db.from('connection_members').select('user_id').eq('connection_id', conn.id);
  if ((members ?? []).some((m) => m.user_id === user.id)) {
    await db.from('profiles').update({ default_connection_id: conn.id }).eq('id', user.id);
    return { ok: true as const, already: true };
  }
  if ((members ?? []).length >= 2) {
    throw new ActionError('conflict', 'That connection already has two people in it.', 409, false);
  }

  if (input.display_name) await db.from('profiles').update({ display_name: input.display_name }).eq('id', user.id);

  // A fresh pair picks its buddy together: clear any solo pick first, so the other phone
  // (which polls for the pick) cannot see a stale one the instant we are paired.
  await db.from('pets').update({ species: null }).eq('connection_id', conn.id);

  // The DB trigger also caps this at two; losing that race returns an error here.
  const { error: joinErr } = await db.from('connection_members').insert({ connection_id: conn.id, user_id: user.id });
  if (joinErr) throw new ActionError('conflict', 'That connection just filled up.', 409, false);
  await db.from('profiles').update({ default_connection_id: conn.id }).eq('id', user.id);
  return { ok: true as const, already: false };
});
