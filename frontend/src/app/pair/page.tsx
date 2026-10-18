import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import { env } from '@/lib/env';
import { getConnectionStatus } from '@/lib/connection-status';
import { PairFlow } from '@/components/yini/PairFlow';
import { SetupNeeded } from '@/components/SetupNeeded';

export const dynamic = 'force-dynamic';

/**
 * Where a freshly signed-in user lands. One account can hold many sealed
 * connections; the hackathon UI pairs exactly one. Anyone already paired is sent on to /home
 * by the server before this renders.
 */
export default async function PairPage() {
  if (!env.isSupabaseConfigured()) return <SetupNeeded />;
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/');
  // Already paired: straight to Home, decided on the server so nothing flashes.
  if ((await getConnectionStatus(user.id)).paired) redirect('/home');
  return <PairFlow />;
}
