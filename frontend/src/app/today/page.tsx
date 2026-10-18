import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import Link from 'next/link';
import type { TodayResponse } from '@/contract';
import { createServerSupabase } from '@/lib/supabase/server';
import { env } from '@/lib/env';
import { CheckIn } from '@/components/CheckIn';
import { DailyFeedback } from '@/components/DailyFeedback';
import { SetupNeeded } from '@/components/SetupNeeded';

export const dynamic = 'force-dynamic';

export default async function TodayPage() {
  if (!env.isSupabaseConfigured()) return <SetupNeeded />;

  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/');

  const h = await headers();
  const res = await fetch(
    `${h.get('x-forwarded-proto') ?? 'http'}://${h.get('host')}/api/today`,
    { headers: { cookie: h.get('cookie') ?? '' }, cache: 'no-store' },
  );
  // Signed in but no partner yet -> pairing, not a dead end.
  if (!res.ok) redirect('/pair');
  const today = (await res.json()) as TodayResponse;

  return (
    <main className="phone" style={{ paddingTop: 36 }}>
      <p style={{ textAlign: 'right', margin: '-12px 0 8px' }}>
        <Link href="/calendar" className="small" style={{ textDecoration: 'none' }}>📅 Calendar</Link>
      </p>
      <CheckIn today={today} />
      <DailyFeedback demo={env.demoMode()} />
    </main>
  );
}
