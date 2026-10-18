/**
 * Everything the nightly agent reads or writes, behind one interface.
 *
 * The pipeline in `nightly.ts` only talks to a `NightlyStore`, so tests run it
 * against an in-memory store and production runs it against Supabase with the
 * service role. Every method is scoped to one connection; the agent's tools are
 * built on top of these and cannot reach another couple's rows.
 */
import type { AnalysisStatus, LeakVerdict } from '@/contract';

export interface Member {
  user_id: string;
  display_name: string;
  timezone: string;
  joined_at: string;
}

export interface ConnectionInfo {
  id: string;
  mediation_paused_at: string | null;
  /** Ordered by joined_at. members[0] is side A and decides the timezone. */
  members: Member[];
}

export interface DayEntry {
  id: string;
  raw_text: string;
  mood_face: number | null;
  created_at: string;
}

export interface ToolEntry {
  local_date: string;
  author_id: string;
  text: string;
  ai_summary: string | null;
  mood_face: number | null;
}

export interface RunRow {
  id: string;
  status: AnalysisStatus;
  started_at: string;
  finished_at?: string | null;
  model: string | null;
  tool_calls: number;
  error: string | null;
}

export interface FeedbackRow {
  run_id: string;
  connection_id: string;
  recipient_id: string;
  local_date: string;
  headline: string;
  bullets: string[];
  leak_dropped: number;
  leak_verdict: LeakVerdict;
}

export interface NightlyStore {
  /** Connections not paused. Callers filter to those with two members. */
  connections(): Promise<ConnectionInfo[]>;
  connection(id: string): Promise<ConnectionInfo | null>;

  entriesFor(connectionId: string, userId: string, day: string): Promise<DayEntry[]>;
  /** `YYYY-MM-DD: summary` lines for days before `day`, most recent first, one per day. */
  recentSummaries(connectionId: string, userId: string, day: string, days: number): Promise<string[]>;
  lastPairSummary(connectionId: string, beforeDay: string): Promise<string | null>;

  getRun(connectionId: string, day: string): Promise<RunRow | null>;
  /** Upsert the (connection, day) run into `running` and return its id. */
  startRun(connectionId: string, day: string, model: string): Promise<string>;
  finishRun(id: string, patch: { status: AnalysisStatus; pair_summary?: string | null; error?: string | null; tool_calls?: number; model?: string }): Promise<void>;

  writeSummary(entryIds: string[], summary: string): Promise<void>;
  upsertFeedback(row: FeedbackRow): Promise<void>;

  // ── tool backends ──
  entriesOnDate(connectionId: string, day: string): Promise<ToolEntry[]>;
  searchEntries(connectionId: string, query: string, limit: number): Promise<ToolEntry[]>;
  pairSummaries(connectionId: string, limit: number): Promise<{ local_date: string; summary: string }[]>;
}
