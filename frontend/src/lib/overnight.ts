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
 * The overnight read, started lazily. The nightly agent already writes everyone's
 * feedback (Grow). Rather than rely only on the daily cron, any signed-in visit to
 * Home or Grow after a day has ended starts the read for that day if it has not been
 * read yet. It is idempotent per (connection, day), so two phones asking at once, or
 * the cron arriving later, cost nothing extra.
 */
export interface Overnight {
  /** The latest finished day that has something written in it. Null when there is none. */
  day: string | null;
  decision: OvernightDecision;
  runStatus: 'running' | 'done' | 'skipped' | 'failed' | null;
}

export async function loadOvernight(db: SupabaseClient, connectionId: string, today: string): Promise<Overnight> {
  const { data } = await db.from('entries').select('local_date')
    .eq('connection_id', connectionId).lt('local_date', today)
    .order('local_date', { ascending: false }).limit(1).maybeSingle();
  const day = (data?.local_date as string | undefined) ?? null;
  if (!day) return { day: null, decision: 'settled', runStatus: null };
  const run = await supabaseNightlyStore(db).getRun(connectionId, day);
  return { day, decision: overnightDecision(run), runStatus: run?.status ?? null };
}

/** Runs the agent for one finished day. Never throws: it runs after a response has gone out. */
export async function runOvernight(connectionId: string, day: string): Promise<void> {
  try {
    const store = supabaseNightlyStore(createAdminSupabase());
    const conn = await store.connection(connectionId);
    if (!conn) return;
    await analyzeConnection(store, conn, day, productionNightlyDeps());
  } catch (e) {
    console.error('[overnight] run crashed', connectionId, day, e);
  }
}

/**
 * If a finished day has not been read yet, schedule the read for after this response
 * goes out, and say what state things are in. Never waits on a model.
 */
export async function startOvernightIfDue(db: SupabaseClient, connectionId: string, today: string): Promise<Overnight> {
  const overnight = await loadOvernight(db, connectionId, today);
  if (overnight.day && overnight.decision === 'run') {
    const day = overnight.day;
    after(() => runOvernight(connectionId, day));
  }
  return overnight;
}

/** For a page render: the same thing, found from just the signed-in user. Quiet on any failure. */
export async function startOvernightForUser(userId: string): Promise<void> {
  try {
    const db = createAdminSupabase();
    const { data: me } = await db.from('profiles').select('timezone, default_connection_id').eq('id', userId).single();
    if (!me?.default_connection_id) return;
    await startOvernightIfDue(db, me.default_connection_id, await appToday(me.timezone));
  } catch (e) {
    console.warn('[overnight] could not check for an unread day:', (e as Error).message);
  }
}
