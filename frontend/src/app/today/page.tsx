import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import type { TodayResponse } from '@/contract';
import { createServerSupabase } from '@/lib/supabase/server';
import { env } from '@/lib/env';
import { CheckIn } from '@/components/CheckIn';
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
  if (!res.ok) {
    return (
      <main className="phone" style={{ paddingTop: 60 }}>
        <p className="display h1">Not connected yet</p>
        <p className="body" style={{ color: 'var(--ink-muted)' }}>
          You need someone on the other side before the daily check-in means anything.
        </p>
      </main>
    );
  }
  const today = (await res.json()) as TodayResponse;

  return (
    <main className="phone" style={{ paddingTop: 36 }}>
      <CheckIn today={today} />
    </main>
  );
}
