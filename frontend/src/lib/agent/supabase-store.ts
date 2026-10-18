/**
 * NightlyStore on Supabase. Uses the SERVICE ROLE, which bypasses RLS, so every
 * query here filters by connection_id itself. Never import from a client component.
 */
import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminSupabase } from '@/lib/supabase/admin';
import type { ConnectionInfo, NightlyStore, ToolEntry } from './store';

type MemberJoin = {
  user_id: string;
  joined_at: string;
  profiles: { display_name: string; timezone: string } | null;
};
type ConnRow = { id: string; mediation_paused_at: string | null; connection_members: MemberJoin[] };

const CONN_SELECT = 'id, mediation_paused_at, connection_members(user_id, joined_at, profiles(display_name, timezone))';

function toInfo(c: ConnRow): ConnectionInfo {
  return {
    id: c.id,
    mediation_paused_at: c.mediation_paused_at,
    members: [...c.connection_members]
      .sort((a, b) => a.joined_at.localeCompare(b.joined_at))
      .map((m) => ({
        user_id: m.user_id,
        joined_at: m.joined_at,
        display_name: m.profiles?.display_name ?? 'Someone',
        timezone: m.profiles?.timezone ?? 'America/Los_Angeles',
      })),
  };
}

function minusDays(day: string, n: number): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

/** PostgREST `or()` syntax breaks on commas and parens; a search term needs neither. */
const cleanQuery = (q: string) => q.replace(/[^\p{L}\p{N}\s'-]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);

/** A single row or null. Throws on a query error rather than reading it as "no row". */
function one<T>(res: { data: T | null; error: { message: string } | null }, what: string): T | null {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return res.data;
}
const rows = <T>(res: { data: T[] | null; error: { message: string } | null }, what: string): T[] => one(res, what) ?? [];

export function supabaseNightlyStore(db: SupabaseClient = createAdminSupabase()): NightlyStore {
  const toolRows = (list: { local_date: string; author_id: string; raw_text: string; ai_summary: string | null; mood_face: number | null }[]): ToolEntry[] =>
    list.map((r) => ({ local_date: r.local_date, author_id: r.author_id, text: r.raw_text, ai_summary: r.ai_summary, mood_face: r.mood_face }));

  return {
    async connections() {
      const list = rows(await db.from('connections').select(CONN_SELECT).is('mediation_paused_at', null), 'connections');
      return (list as unknown as ConnRow[]).map(toInfo);
    },

    async connection(id) {
      const row = one(await db.from('connections').select(CONN_SELECT).eq('id', id).maybeSingle(), 'connection');
      return row ? toInfo(row as unknown as ConnRow) : null;
    },

    async entriesFor(connectionId, userId, day) {
      return rows(await db.from('entries').select('id, raw_text, mood_face, created_at')
        .eq('connection_id', connectionId).eq('author_id', userId).eq('local_date', day)
        .order('created_at', { ascending: true }), 'entriesFor');
    },

    async recentSummaries(connectionId, userId, day, days) {
      if (days <= 0) return [];
      const list = rows(await db.from('entries').select('local_date, ai_summary')
        .eq('connection_id', connectionId).eq('author_id', userId)
        .lt('local_date', day).gte('local_date', minusDays(day, days))
        .not('ai_summary', 'is', null)
        .order('local_date', { ascending: false }), 'recentSummaries');
      const seen = new Set<string>();
      return list.filter((r) => !seen.has(r.local_date) && seen.add(r.local_date))
        .map((r) => `${r.local_date}: ${r.ai_summary}`);
    },

    async lastPairSummary(connectionId, beforeDay) {
      const row = one<{ pair_summary: string | null }>(await db.from('analysis_runs').select('pair_summary')
        .eq('connection_id', connectionId).eq('status', 'done').lt('local_date', beforeDay)
        .order('local_date', { ascending: false }).limit(1).maybeSingle(), 'lastPairSummary');
      return row?.pair_summary ?? null;
    },

    async getRun(connectionId, day) {
      return one(await db.from('analysis_runs').select('id, status, started_at, model, tool_calls, error')
        .eq('connection_id', connectionId).eq('local_date', day).maybeSingle(), 'getRun');
    },

    async startRun(connectionId, day, model) {
      const row = one<{ id: string }>(await db.from('analysis_runs').upsert({
        connection_id: connectionId, local_date: day, status: 'running', model,
        started_at: new Date().toISOString(), finished_at: null, error: null, tool_calls: 0,
      }, { onConflict: 'connection_id,local_date' }).select('id').single(), 'startRun');
      if (!row) throw new Error('startRun: no row returned');
      return row.id;
    },

    async finishRun(id, patch) {
      one(await db.from('analysis_runs').update({ ...patch, finished_at: new Date().toISOString() }).eq('id', id), 'finishRun');
    },

    async writeSummary(entryIds, summary) {
      if (!entryIds.length) return;
      one(await db.from('entries').update({ ai_summary: summary }).in('id', entryIds), 'writeSummary');
    },

    async upsertFeedback(row) {
      one(await db.from('daily_feedback').upsert({ ...row, created_at: new Date().toISOString() },
        { onConflict: 'recipient_id,connection_id,local_date' }), 'upsertFeedback');
    },

    async entriesOnDate(connectionId, day) {
      return toolRows(rows(await db.from('entries').select('local_date, author_id, raw_text, ai_summary, mood_face')
        .eq('connection_id', connectionId).eq('local_date', day).order('created_at'), 'entriesOnDate'));
    },

    async searchEntries(connectionId, query, limit) {
      const q = cleanQuery(query);
      if (!q) return [];
      return toolRows(rows(await db.from('entries').select('local_date, author_id, raw_text, ai_summary, mood_face')
        .eq('connection_id', connectionId)
        .or(`raw_text.ilike.%${q}%,ai_summary.ilike.%${q}%`)
        .order('local_date', { ascending: false }).limit(limit), 'searchEntries'));
    },

    async pairSummaries(connectionId, limit) {
      const list = rows(await db.from('analysis_runs').select('local_date, pair_summary')
        .eq('connection_id', connectionId).eq('status', 'done')
        .order('local_date', { ascending: false }).limit(limit), 'pairSummaries');
      return list.filter((r) => r.pair_summary).map((r) => ({ local_date: r.local_date, summary: r.pair_summary as string }));
    },
  };
}
