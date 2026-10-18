import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { createServerSupabase } from '@/lib/supabase/server';
import { env } from '@/lib/env';
import { GlowView } from '@/components/GlowView';
import { SetupNeeded } from '@/components/SetupNeeded';

export const metadata: Metadata = { title: 'Glow · Yini' };
export const dynamic = 'force-dynamic';

export default async function GlowPage() {
  if (!env.isSupabaseConfigured()) return <SetupNeeded />;
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/');
  return (
    <main className="phone" style={{ paddingTop: 28 }}>
      <GlowView />
    </main>
  );
}
