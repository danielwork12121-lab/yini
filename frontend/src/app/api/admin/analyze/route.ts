import { actionTypes } from '@/ontology';
import { actionRoute } from '@/lib/http/action-route';
import { env } from '@/lib/env';
import { productionNightlyDeps } from '@/lib/agent/agent';
import { supabaseNightlyStore } from '@/lib/agent/supabase-store';
import { sweep } from '@/lib/agent/nightly';

export const maxDuration = 300;

export const POST = actionRoute(actionTypes.analyzeNow, async ({ input }) => ({
  runs: await sweep(supabaseNightlyStore(), productionNightlyDeps(), {
    connectionId: input.connection_id,
    day: input.local_date,
    force: input.force,
    target: env.nightlyTarget(),
  }),
}));
