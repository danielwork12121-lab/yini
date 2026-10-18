import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { createServerSupabase } from '@/lib/supabase/server';
import { env } from '@/lib/env';
import { GrowView } from '@/components/GrowView';
import { SetupNeeded } from '@/components/SetupNeeded';

export const metadata: Metadata = { title: 'Grow · Yini' };
export const dynamic = 'force-dynamic';

export default async function GrowPage() {
  if (!env.isSupabaseConfigured()) return <SetupNeeded />;
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/');
  return (
    <main className="phone" style={{ paddingTop: 28 }}>
      <GrowView />
    </main>
  );
}
