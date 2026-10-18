import 'server-only';
import { after } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { productionNightlyDeps } from '@/lib/agent/agent';
import { supabaseNightlyStore } from '@/lib/agent/supabase-store';
import { analyzeConnection } from '@/lib/agent/nightly';
import { overnightDecision, type OvernightDecision } from '@/lib/overnight-policy';
import { appToday } from '@/lib/clock';

/**
 * Yini's read of a day, kept up to date. The nightly agent writes everyone's feedback
 * (Grow). It runs in the background right after someone logs, so Grow is already there
 * when it is opened, and any visit to Home or Grow starts it if a day has not been read
 * yet or something was written after the last read. It is idempotent: two phones asking
 * at once, or the cron arriving later, cost nothing extra.
 */
export interface Overnight {
  /** The newest day that has something written in it. Null when nothing was ever logged. */
  day: string | null;
  decision: OvernightDecision;
  runStatus: 'running' | 'done' | 'skipped' | 'failed' | null;
}

export async function loadOvernight(db: SupabaseClient, connectionId: string, today: string): Promise<Overnight> {
  const { data } = await db.from('entries').select('local_date, created_at')
    .eq('connection_id', connectionId).lte('local_date', today)
    .order('local_date', { ascending: false }).order('created_at', { ascending: false }).limit(1).maybeSingle();
  const day = (data?.local_date as string | undefined) ?? null;
  if (!day) return { day: null, decision: 'settled', runStatus: null };
  const run = await supabaseNightlyStore(db).getRun(connectionId, day);
  return { day, decision: overnightDecision(run, Date.now(), data?.created_at as string | null), runStatus: run?.status ?? null };
}

/** Runs the agent for one day. Never throws: it runs after a response has gone out. */
export async function runOvernight(connectionId: string, day: string): Promise<void> {
  try {
    const store = supabaseNightlyStore(createAdminSupabase());
    const conn = await store.connection(connectionId);
    if (!conn) return;
    // force: the day may already have a finished read that is now out of date.
    await analyzeConnection(store, conn, day, productionNightlyDeps(), { force: true });
  } catch (e) {
    console.error('[overnight] run crashed', connectionId, day, e);
  }
}

/**
 * If the newest day needs reading, schedule the read for after this response goes out,
 * and say what state things are in. Never waits on a model.
 */
export async function startOvernightIfDue(db: SupabaseClient, connectionId: string, today: string): Promise<Overnight> {
  const overnight = await loadOvernight(db, connectionId, today);
  if (overnight.day && overnight.decision === 'run') {
    const day = overnight.day;
    after(() => runOvernight(connectionId, day));
  }
  return overnight;
}

/**
 * Read the newest day now if it needs it (right after someone logs, or when Home opens), so Grow is ready before anyone opens it.
 * Call from inside `after()`. If a read is already running it leaves it alone, and the
 * next visit to Home or Grow picks up whatever was written in the meantime.
 */
export async function readNowForUser(userId: string): Promise<void> {
  try {
    const db = createAdminSupabase();
    const { data: me } = await db.from('profiles').select('timezone, default_connection_id').eq('id', userId).single();
    if (!me?.default_connection_id) return;
    const today = await appToday(me.timezone);
    const o = await loadOvernight(db, me.default_connection_id, today);
    if (o.day && o.decision === 'run') await runOvernight(me.default_connection_id, o.day);
  } catch (e) {
    console.warn('[overnight] could not read right after a log:', (e as Error).message);
  }
}
