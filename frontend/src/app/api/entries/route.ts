import { actionTypes } from '@/ontology';
import { actionRoute, ActionError } from '@/lib/http/action-route';

/** Your own journal. The user's client, so RLS (author_id = auth.uid()) does the filtering. */
export const GET = actionRoute(actionTypes.listEntries, async ({ input, supabase }) => {
  const { data, error } = await supabase.from('entries')
    .select('id, local_date, raw_text, input_mode, state, mood_face, ai_summary, created_at')
    .order('local_date', { ascending: false }).order('created_at', { ascending: false })
    .limit(input.limit);
  if (error) throw new ActionError('server_error', error.message, 500);
  return {
    entries: (data ?? []).map((e) => ({
      id: e.id, local_date: e.local_date, text: e.raw_text, input_mode: e.input_mode,
      state: e.state, mood_face: e.mood_face, ai_summary: e.ai_summary, created_at: e.created_at,
    })),
  };
});
