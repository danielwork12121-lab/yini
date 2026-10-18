import type { Metadata } from 'next';
import { env } from '@/lib/env';
import { CalendarView } from '@/components/CalendarView';
import { SetupNeeded } from '@/components/SetupNeeded';

export const metadata: Metadata = { title: 'Calendar · Yini' };

/** Same as Glow and Grow: no sign-in check here, so the page opens at once. The API answers 401 and the view sends you back to sign in. */
export default function CalendarPage() {
  if (!env.isSupabaseConfigured()) return <SetupNeeded />;
  return <CalendarView />;
}
