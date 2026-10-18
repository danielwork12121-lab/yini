import 'server-only';
import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import { env } from '@/lib/env';
import { getConnectionStatus } from '@/lib/connection-status';

/** For server pages that need a signed-in, paired person. Sends everyone else to where they belong. */
export async function requirePairedUser() {
  if (!env.isSupabaseConfigured()) redirect('/');
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/');
  const status = await getConnectionStatus(user.id);
  if (!status.paired) redirect('/pair');
  return { user, status };
}
