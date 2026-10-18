import { after } from 'next/server';
import type { ApiError } from '@/contract';
import { actionTypes } from '@/ontology';
import { actionRoute, ActionError } from '@/lib/http/action-route';
import { CheckinError, runCheckin } from '@/lib/checkin';
import { readNowForUser } from '@/lib/overnight';

// Node runtime is the project default here; a route-segment `runtime` export is
// incompatible with this Next version's cacheComponents setting.
export const maxDuration = 120; // the read of the day runs after the answer is sent, inside this budget

export const POST = actionRoute(actionTypes.checkIn, async ({ input, user, supabase }) => {
  try {
    const result = await runCheckin(supabase, user.id, input);
    // Yini reads the day in the background so Grow is ready by the time anyone opens it.
    after(() => readNowForUser(user.id));
    return result;
  } catch (e) {
    if (e instanceof CheckinError) throw new ActionError(e.code as ApiError['code'], e.message, 400, e.recoverable);
    console.error('[checkin]', e);
    throw new ActionError('server_error', 'Something broke on our side. Your entry was saved.', 500);
  }
});
