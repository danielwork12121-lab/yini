import { actionTypes } from '@/ontology';
import { actionRoute, ActionError } from '@/lib/http/action-route';
import { FEEDBACK_VIEW } from '@/lib/feedback';

/** Your nightly feedback history. RLS limits rows to recipient_id = auth.uid(). */
export const GET = actionRoute(actionTypes.listFeedback, async ({ input, supabase }) => {
  const { data, error } = await supabase.from('daily_feedback').select(FEEDBACK_VIEW)
    .order('local_date', { ascending: false }).limit(input.limit);
  if (error) throw new ActionError('server_error', error.message, 500);
  return { feedback: data ?? [] };
});
