import { redirect } from 'next/navigation';
import { after } from 'next/server';
import type { Metadata } from 'next';
import { createServerSupabase } from '@/lib/supabase/server';
import { getConnectionStatus } from '@/lib/connection-status';
import { env } from '@/lib/env';
import { readNowForUser } from '@/lib/overnight';
import { HomeView } from '@/components/yini/HomeView';
import { SetupNeeded } from '@/components/SetupNeeded';

export const metadata: Metadata = { title: 'Home · Yini' };
export const dynamic = 'force-dynamic';
export const maxDuration = 120; // the overnight read can start from here, after the page is sent

/** The temporary home: your cat, the feed button, and the way to everything else. */
export default async function HomePage() {
  if (!env.isSupabaseConfigured()) return <SetupNeeded />;
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/');
  const status = await getConnectionStatus(user.id);
  if (!status.paired) redirect('/pair');
  // If the latest day has not been read yet, start that after the page is sent, so Home never waits on it.
  after(() => readNowForUser(user.id));
  return <HomeView name={status.display_name ?? ''} partner={status.partner_display_name ?? 'Your person'} />;
}
