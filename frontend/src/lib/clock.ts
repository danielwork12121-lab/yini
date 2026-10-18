import 'server-only';
import { appDateFor } from '@/contract';
import { createAdminSupabase } from '@/lib/supabase/admin';

/**
 * The testing clock. `app_clock.day_offset` moves "today" forwards for everyone, so a
 * demo can skip to tomorrow. It is 0 in normal life, and 0 whenever the table is
 * missing or unreachable: a broken clock must never break the app.
 */
const TTL_MS = 2_000;
let cached: { at: number; offset: number } | null = null;
let warned = false;

export async function getDayOffset(): Promise<number> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.offset;
  let offset = 0;
  try {
    const { data, error } = await createAdminSupabase().from('app_clock').select('day_offset').eq('id', 1).maybeSingle();
    if (error) {
      if (!warned) { warned = true; console.warn('[clock] app_clock unreadable, using real time:', error.message); }
    } else if (data && Number.isInteger(data.day_offset)) {
      offset = data.day_offset;
    }
  } catch (e) {
    if (!warned) { warned = true; console.warn('[clock] app_clock unreachable, using real time:', (e as Error).message); }
  }
  cached = { at: Date.now(), offset };
  return offset;
}

/** The app's "today" for someone in this timezone. */
export async function appToday(timezone: string): Promise<string> {
  return appDateFor(timezone, await getDayOffset());
}

/** "Now", moved by the same offset. For the nightly sweep, which decides its target day from the clock. */
export async function appNow(): Promise<Date> {
  return new Date(Date.now() + (await getDayOffset()) * 86_400_000);
}
