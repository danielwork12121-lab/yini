import { actionTypes } from '@/ontology';
import { actionRoute, ActionError } from '@/lib/http/action-route';
import { FEEDBACK_VIEW } from '@/lib/feedback';

export const GET = actionRoute(actionTypes.getLatestFeedback, async ({ supabase }) => {
  const { data, error } = await supabase.from('daily_feedback').select(FEEDBACK_VIEW)
    .order('local_date', { ascending: false }).limit(1).maybeSingle();
  if (error) throw new ActionError('server_error', error.message, 500);
  return { feedback: data };
});
