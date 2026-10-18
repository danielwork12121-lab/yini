import { localDateFor } from '@/contract';
import { actionTypes } from '@/ontology';
import { actionRoute, ActionError } from '@/lib/http/action-route';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { env } from '@/lib/env';
import { productionNightlyDeps } from '@/lib/agent/agent';
import { supabaseNightlyStore } from '@/lib/agent/supabase-store';
import { sweep } from '@/lib/agent/nightly';

export const maxDuration = 120;

/** Demo only: "pretend it's midnight" for the caller's own connection. */
export const POST = actionRoute(actionTypes.runMyAnalysis, async ({ input, user }) => {
  if (!env.demoMode()) throw new ActionError('forbidden', 'Demo mode is off', 403, false);
  const db = createAdminSupabase();
  const { data: me } = await db.from('profiles').select('timezone, default_connection_id').eq('id', user.id).single();
  if (!me?.default_connection_id) throw new ActionError('no_connection', 'Not connected yet', 400, false);

  const runs = await sweep(supabaseNightlyStore(db), productionNightlyDeps(), {
    connectionId: me.default_connection_id,
    day: input.local_date ?? localDateFor(me.timezone),
    force: true,
    target: 'same_day',
  });
  return { runs };
});
