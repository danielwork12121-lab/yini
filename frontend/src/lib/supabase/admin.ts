import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';

/**
 * BYPASSES RLS ENTIRELY. Server-only, never imported into a client component —
 * `server-only` makes that a build error rather than a 2am discovery.
 *
 * Needed because the mediator writes rows neither user may write: concerns,
 * care_acts, nudges, pet feedings. Every function that uses it is responsible for
 * its own scoping, since the database will not second-guess it.
 */
export function createAdminSupabase() {
  return createClient(env.supabaseUrl(), env.supabaseServiceKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
