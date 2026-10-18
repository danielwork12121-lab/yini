import { actionTypes } from '@/ontology';
import { actionRoute } from '@/lib/http/action-route';
import { env } from '@/lib/env';
import { productionNightlyDeps } from '@/lib/agent/agent';
import { supabaseNightlyStore } from '@/lib/agent/supabase-store';
import { sweep } from '@/lib/agent/nightly';

// Vercel Cron issues a GET with `Authorization: Bearer $CRON_SECRET`. See vercel.json.
export const maxDuration = 300;

export const GET = actionRoute(actionTypes.runNightlySweep, async () => ({
  runs: await sweep(supabaseNightlyStore(), productionNightlyDeps(), { target: env.nightlyTarget() }),
}));
