import type { ApiError } from '@/contract';
import { actionTypes } from '@/ontology';
import { actionRoute, ActionError } from '@/lib/http/action-route';
import { CheckinError, runCheckin } from '@/lib/checkin';

// Node runtime is the project default here; a route-segment `runtime` export is
// incompatible with this Next version's cacheComponents setting.
export const maxDuration = 60;

export const POST = actionRoute(actionTypes.checkIn, async ({ input, user, supabase }) => {
  try {
    return await runCheckin(supabase, user.id, input);
  } catch (e) {
    if (e instanceof CheckinError) throw new ActionError(e.code as ApiError['code'], e.message, 400, e.recoverable);
    console.error('[checkin]', e);
    throw new ActionError('server_error', 'Something broke on our side. Your entry was saved.', 500);
  }
});
