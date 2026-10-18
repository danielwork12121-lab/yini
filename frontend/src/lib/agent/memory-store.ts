/**
 * In-memory NightlyStore for tests and local experiments. Same contract as the
 * Supabase store, including per-connection scoping.
 */
import type { ConnectionInfo, FeedbackRow, NightlyStore, RunRow, ToolEntry } from './store';

export interface MemEntry {
  id: string; connection_id: string; author_id: string; local_date: string;
  raw_text: string; mood_face: number | null; ai_summary: string | null; created_at: string;
}
export interface MemRun extends RunRow {
  connection_id: string; local_date: string; pair_summary: string | null;
}

export function memoryNightlyStore(seed: { connections: ConnectionInfo[]; entries?: MemEntry[] }) {
  const connections = seed.connections;
  const entries: MemEntry[] = [...(seed.entries ?? [])];
  const runs: MemRun[] = [];
  const feedback: FeedbackRow[] = [];
  let seq = 0;

  const toTool = (e: MemEntry): ToolEntry =>
    ({ local_date: e.local_date, author_id: e.author_id, text: e.raw_text, ai_summary: e.ai_summary, mood_face: e.mood_face });
  const byDateDesc = (a: { local_date: string }, b: { local_date: string }) => b.local_date.localeCompare(a.local_date);

  const store: NightlyStore = {
    async connections() { return connections.filter((c) => !c.mediation_paused_at); },
    async connection(id) { return connections.find((c) => c.id === id) ?? null; },

    async entriesFor(cid, uid, day) {
      return entries.filter((e) => e.connection_id === cid && e.author_id === uid && e.local_date === day)
        .sort((a, b) => a.created_at.localeCompare(b.created_at));
    },
    async recentSummaries(cid, uid, day, days) {
      const from = new Date(`${day}T12:00:00Z`); from.setUTCDate(from.getUTCDate() - days);
      const min = from.toISOString().slice(0, 10);
      const seen = new Set<string>();
      return entries
        .filter((e) => e.connection_id === cid && e.author_id === uid && e.local_date < day && e.local_date >= min && e.ai_summary)
        .sort(byDateDesc)
        .filter((e) => !seen.has(e.local_date) && seen.add(e.local_date))
        .map((e) => `${e.local_date}: ${e.ai_summary}`);
    },
    async lastPairSummary(cid, before) {
      return runs.filter((r) => r.connection_id === cid && r.status === 'done' && r.local_date < before)
        .sort(byDateDesc)[0]?.pair_summary ?? null;
    },

    async getRun(cid, day) { return runs.find((r) => r.connection_id === cid && r.local_date === day) ?? null; },
    async startRun(cid, day, model) {
      let r = runs.find((x) => x.connection_id === cid && x.local_date === day);
      if (!r) {
        r = { id: `run-${++seq}`, connection_id: cid, local_date: day, status: 'running', started_at: '', model, pair_summary: null, error: null, tool_calls: 0 };
        runs.push(r);
      }
      Object.assign(r, { status: 'running', started_at: new Date().toISOString(), model, error: null });
      return r.id;
    },
    async finishRun(id, patch) { Object.assign(runs.find((r) => r.id === id)!, patch); },

    async writeSummary(ids, summary) { for (const e of entries) if (ids.includes(e.id)) e.ai_summary = summary; },
    async upsertFeedback(row) {
      const i = feedback.findIndex((f) => f.recipient_id === row.recipient_id && f.connection_id === row.connection_id && f.local_date === row.local_date);
      if (i >= 0) feedback[i] = row; else feedback.push(row);
    },

    async entriesOnDate(cid, day) { return entries.filter((e) => e.connection_id === cid && e.local_date === day).map(toTool); },
    async searchEntries(cid, q, limit) {
      const needle = q.toLowerCase();
      return entries.filter((e) => e.connection_id === cid &&
        (e.raw_text.toLowerCase().includes(needle) || (e.ai_summary ?? '').toLowerCase().includes(needle)))
        .sort(byDateDesc).slice(0, limit).map(toTool);
    },
    async pairSummaries(cid, limit) {
      return runs.filter((r) => r.connection_id === cid && r.status === 'done' && r.pair_summary)
        .sort(byDateDesc).slice(0, limit).map((r) => ({ local_date: r.local_date, summary: r.pair_summary! }));
    },
  };
  return { store, entries, runs, feedback };
}
