import { actionTypes } from '@/ontology';
import { actionRoute, ActionError } from '@/lib/http/action-route';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { getConnectionStatus } from '@/lib/connection-status';
import type { GlowResponse } from '@/contract';

export const dynamic = 'force-dynamic';

type Row = { id: string; text: string; status: string; entries: { local_date: string } | { local_date: string }[] | null };

/**
 * The kind things your partner has said about you, in their own words. They were
 * verified as literal slices of what your partner wrote when the entry was saved, so
 * nothing here is the app's own wording. Only the day they said it comes with them.
 */
export const GET = actionRoute(actionTypes.getGlow, async ({ user }): Promise<GlowResponse> => {
  const db = createAdminSupabase();
  const [{ data, error }, status] = await Promise.all([
    db.from('kind_words').select('id, text, status, entries(local_date)')
      .eq('recipient_id', user.id).in('status', ['approved', 'surfaced'])
      .order('created_at', { ascending: false }).limit(100),
    getConnectionStatus(user.id),
  ]);
  if (error) throw new ActionError('server_error', error.message, 500);
  const rows = (data ?? []) as unknown as Row[];

  // Opening Glow is what "surfaces" them; the recipient-facing RLS policy waits for it.
  const fresh = rows.filter((r) => r.status === 'approved').map((r) => r.id);
  if (fresh.length) {
    await db.from('kind_words').update({ status: 'surfaced', surfaced_at: new Date().toISOString() })
      .in('id', fresh).eq('recipient_id', user.id);
  }

  return {
    partner_display_name: status.partner_display_name ?? 'Your person',
    compliments: rows.map((r) => {
      const entry = Array.isArray(r.entries) ? r.entries[0] : r.entries;
      return { id: r.id, text: r.text, said_on: entry?.local_date ?? null, is_new: r.status === 'approved' };
    }),
  };
});
