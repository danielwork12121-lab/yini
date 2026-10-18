import 'server-only';
import { createAdminSupabase } from '@/lib/supabase/admin';

/**
 * Where is this person: no connection yet, waiting for a partner, or paired.
 * Shared by GET /api/connection and the server pages, so a paired person is sent
 * straight to Home on the server instead of flashing the invite page first.
 */
export async function getConnectionStatus(userId: string) {
  const db = createAdminSupabase();
  const { data: me } = await db.from('profiles').select('display_name, default_connection_id').eq('id', userId).single();
  if (!me?.default_connection_id) {
    return { paired: false, display_name: me?.display_name ?? null, invite_code: null, partner_display_name: null, pet_species: null };
  }
  const [{ data: conn }, { data: members }, { data: pet }] = await Promise.all([
    db.from('connections').select('invite_code').eq('id', me.default_connection_id).single(),
    db.from('connection_members').select('user_id, profiles(display_name)').eq('connection_id', me.default_connection_id),
    db.from('pets').select('species').eq('connection_id', me.default_connection_id).maybeSingle(),
  ]);
  const partner = (members ?? []).find((m) => m.user_id !== userId)?.profiles as unknown as { display_name: string } | undefined;
  return {
    paired: Boolean(partner),
    display_name: me.display_name,
    invite_code: conn?.invite_code ?? null,
    partner_display_name: partner?.display_name ?? null,
    pet_species: pet?.species ?? null,
  };
}
