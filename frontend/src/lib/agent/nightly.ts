/**
 * The nightly run for one connection and one day.
 *
 *   load both days' entries + memory → agent (gather with tools, then compose JSON)
 *   → shingle-check each side's feedback against the OTHER side's raw text
 *   → adversarial check → write ai_summary, pair_summary, two feedback rows
 *
 * Realtime notifies each recipient when their daily_feedback row lands.
 * Idempotent per (connection, day): a finished run is not repeated unless forced.
 *
 * No `server-only` here and no env reads: every side effect comes in through the
 * store and `deps`, which is what lets the tests run this file end to end.
 */
import {
  scrubFeedback, nightlyTargetDay,
  type AnalysisRunView, type FeedbackFor, type LeakVerdict, type NightlyInput, type NightlyOutput, type NightlyTarget,
} from '@/contract';
import { normalizeQuest } from '@/lib/quest';
import { buildTools, type AgentTool } from './tools';
import type { ConnectionInfo, DayEntry, NightlyStore } from './store';

export interface NightlyDeps {
  agent(input: NightlyInput, tools: AgentTool[]): Promise<{ output: NightlyOutput; model: string; toolCalls: number }>;
  /** Adversarial reconstruction on the final text. Return verdict 'skipped' to opt out. */
  adversarial(
    feedback: FeedbackFor,
    partnerName: string,
    source?: { partnerText: string | null; ownText: string | null },
  ): Promise<{ feedback: FeedbackFor; verdict: LeakVerdict }>;
  historyDays: number;
  /** Label written to analysis_runs.model before the agent reports its own. */
  modelLabel: string;
}

/** A run stuck in `running` this long is assumed dead (a crashed function) and retried. */
const STALE_RUN_MS = 15 * 60_000;
const MAX_ENTRY_CHARS = 24_000;

class Skip extends Error {}

const joinEntries = (rows: DayEntry[]) =>
  rows.length ? rows.map((r) => r.raw_text).join('\n\n').slice(0, MAX_ENTRY_CHARS) : null;
const lowestMood = (rows: DayEntry[]) => {
  const faces = rows.map((r) => r.mood_face).filter((m): m is number => m !== null);
  return faces.length ? Math.min(...faces) : null;
};

export async function analyzeConnection(
  store: NightlyStore,
  conn: ConnectionInfo,
  day: string,
  deps: NightlyDeps,
  opts: { force?: boolean } = {},
): Promise<AnalysisRunView> {
  const view = (status: AnalysisRunView['status'], extra: Partial<AnalysisRunView> = {}): AnalysisRunView =>
    ({ connection_id: conn.id, local_date: day, status, model: null, tool_calls: 0, error: null, ...extra });

  const existing = await store.getRun(conn.id, day);
  if (existing && !opts.force) {
    const stale = existing.status === 'running' && Date.now() - Date.parse(existing.started_at) > STALE_RUN_MS;
    if (existing.status === 'done' || (existing.status === 'running' && !stale)) {
      return view(existing.status, { model: existing.model, tool_calls: existing.tool_calls, error: existing.error });
    }
  }

  const runId = await store.startRun(conn.id, day, deps.modelLabel);
  try {
    if (conn.mediation_paused_at) throw new Skip('mediation paused for this connection');
    if (conn.members.length < 2) throw new Skip('connection has no second member yet');
    const [a, b] = conn.members;

    const [ea, eb] = await Promise.all([store.entriesFor(conn.id, a.user_id, day), store.entriesFor(conn.id, b.user_id, day)]);
    if (!ea.length && !eb.length) throw new Skip('no entries for that day');

    const [ha, hb, pairSummary] = await Promise.all([
      store.recentSummaries(conn.id, a.user_id, day, deps.historyDays),
      store.recentSummaries(conn.id, b.user_id, day, deps.historyDays),
      store.lastPairSummary(conn.id, day),
    ]);
    const input: NightlyInput = {
      local_date: day,
      side_a: { label: 'A', display_name: a.display_name, entries_text: joinEntries(ea), mood_face: lowestMood(ea), recent_summaries: ha },
      side_b: { label: 'B', display_name: b.display_name, entries_text: joinEntries(eb), mood_face: lowestMood(eb), recent_summaries: hb },
      previous_pair_summary: pairSummary,
    };

    const { output, model, toolCalls } = await deps.agent(input, buildTools(store, conn.id, conn.members));

    // A's feedback is checked against B's words, and B's against A's. Never against one's own.
    const sides = [
      { me: a, fb: output.feedback_for_a, partnerText: input.side_b.entries_text, ownText: input.side_a.entries_text, partnerName: b.display_name },
      { me: b, fb: output.feedback_for_b, partnerText: input.side_a.entries_text, ownText: input.side_b.entries_text, partnerName: a.display_name },
    ];
    // The two sides are independent, so they are checked and written at the same time.
    await Promise.all(sides.map(async (s) => {
      const scrubbed = scrubFeedback(s.fb, s.partnerText);
      const adv = await deps.adversarial(
        { headline: scrubbed.headline, bullets: scrubbed.bullets }, s.partnerName,
        { partnerText: s.partnerText, ownText: s.ownText },
      );
      await store.upsertFeedback({
        run_id: runId, connection_id: conn.id, recipient_id: s.me.user_id, local_date: day,
        headline: adv.feedback.headline, bullets: adv.feedback.bullets.map(normalizeQuest),
        leak_dropped: scrubbed.dropped, leak_verdict: adv.verdict,
      });
    }));

    await store.writeSummary(ea.map((e) => e.id), output.side_a.summary);
    await store.writeSummary(eb.map((e) => e.id), output.side_b.summary);
    await store.finishRun(runId, { status: 'done', pair_summary: output.pair_summary, tool_calls: toolCalls, model });
    return view('done', { model, tool_calls: toolCalls });
  } catch (e) {
    const skipped = e instanceof Skip;
    const error = skipped ? e.message : `${(e as Error).name}: ${(e as Error).message}`.slice(0, 1000);
    if (!skipped) console.error('[nightly] run failed', conn.id, day, e);
    await store.finishRun(runId, { status: skipped ? 'skipped' : 'failed', error });
    return view(skipped ? 'skipped' : 'failed', { error, model: deps.modelLabel });
  }
}

/**
 * Sweep every connection (or one) for its target day. Sequential on purpose: a
 * hackathon has a handful of couples, and one at a time keeps model rate limits
 * and function duration predictable.
 */
export async function sweep(
  store: NightlyStore,
  deps: NightlyDeps,
  opts: { connectionId?: string; day?: string; force?: boolean; target: NightlyTarget; now?: Date },
): Promise<AnalysisRunView[]> {
  const conns = opts.connectionId
    ? [await store.connection(opts.connectionId)].filter((c): c is ConnectionInfo => c !== null)
    : (await store.connections()).filter((c) => c.members.length === 2);

  const runs: AnalysisRunView[] = [];
  for (const c of conns) {
    const tz = c.members[0]?.timezone ?? 'America/Los_Angeles';
    const day = opts.day ?? nightlyTargetDay(tz, opts.target, opts.now);
    runs.push(await analyzeConnection(store, c, day, deps, { force: opts.force }));
  }
  return runs;
}
