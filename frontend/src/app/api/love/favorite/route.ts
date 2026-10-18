import { actionTypes } from '@/ontology';
import { actionRoute, ActionError } from '@/lib/http/action-route';
import { createAdminSupabase } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/** Keep a note you received close, or let it go. Only the person it was sent to can. */
export const POST = actionRoute(actionTypes.setLoveFavorite, async ({ input, user }) => {
  const db = createAdminSupabase();
  const { data, error } = await db.from('love_notes').update({ is_favorite: input.favorite })
    .eq('id', input.id).eq('recipient_id', user.id).select('id, is_favorite').maybeSingle();
  if (error) throw new ActionError('server_error', error.message, 500);
  if (!data) throw new ActionError('not_found', 'That note is not yours to favorite', 404);
  return { id: data.id as string, is_favorite: data.is_favorite as boolean };
});
