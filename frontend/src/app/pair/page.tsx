import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import { env } from '@/lib/env';
import { PairFlow } from '@/components/yini/PairFlow';
import { SetupNeeded } from '@/components/SetupNeeded';

export const dynamic = 'force-dynamic';

/**
 * Where a freshly signed-in user lands. One account can hold many sealed
 * connections; the hackathon UI pairs exactly one. PairFlow sends anyone who is
 * already paired straight on to /today.
 */
export default async function PairPage() {
  if (!env.isSupabaseConfigured()) return <SetupNeeded />;
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/');
  return <PairFlow />;
}
