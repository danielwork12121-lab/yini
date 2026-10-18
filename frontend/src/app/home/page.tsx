import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { createServerSupabase } from '@/lib/supabase/server';
import { getConnectionStatus } from '@/lib/connection-status';
import { env } from '@/lib/env';
import { HomeView } from '@/components/yini/HomeView';
import { SetupNeeded } from '@/components/SetupNeeded';

export const metadata: Metadata = { title: 'Home · Yini' };
export const dynamic = 'force-dynamic';

/** The temporary home: your cat, the feed button, and the way to everything else. */
export default async function HomePage() {
  if (!env.isSupabaseConfigured()) return <SetupNeeded />;
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/');
  const status = await getConnectionStatus(user.id);
  if (!status.paired) redirect('/pair');
  return <HomeView name={status.display_name ?? ''} partner={status.partner_display_name ?? 'Your person'} />;
}
