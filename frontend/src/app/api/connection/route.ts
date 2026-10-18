import { actionTypes } from '@/ontology';
import { actionRoute, ActionError } from '@/lib/http/action-route';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { getConnectionStatus } from '@/lib/connection-status';

/** No I, O, 0 or 1 — people read these aloud to each other. */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const code = () => Array.from({ length: 6 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');

/** GET: where am I? Drives whether the app shows /pair or /today. */
export const GET = actionRoute(actionTypes.getConnection, async ({ user }) => getConnectionStatus(user.id));

/** POST: start a connection and get a code to hand to the other person. */
export const POST = actionRoute(actionTypes.createConnection, async ({ input, user }) => {
  const db = createAdminSupabase();
  if (input.display_name) await db.from('profiles').update({ display_name: input.display_name }).eq('id', user.id);

  const { data: me } = await db.from('profiles').select('default_connection_id').eq('id', user.id).single();
  if (me?.default_connection_id) {
    const { data: existing } = await db.from('connections').select('invite_code').eq('id', me.default_connection_id).single();
    if (existing) {
      // The buddy is picked after the code is shown, so a repeat call may carry the species.
      if (input.species) await db.from('pets').update({ species: input.species }).eq('connection_id', me.default_connection_id);
      return { invite_code: existing.invite_code };
    }
  }

  // Codes are short enough to collide; retry rather than fail the user.
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: conn, error } = await db.from('connections')
      .insert({ invite_code: code(), kind: 'partner' }).select('id, invite_code').single();
    if (error) continue;
    await db.from('connection_members').insert({ connection_id: conn.id, user_id: user.id });
    await db.from('pets').insert({ connection_id: conn.id, name: 'Egg', species: input.species ?? null });
    await db.from('profiles').update({ default_connection_id: conn.id }).eq('id', user.id);
    return { invite_code: conn.invite_code };
  }
  throw new ActionError('server_error', 'Could not create a code, try again', 500);
});
