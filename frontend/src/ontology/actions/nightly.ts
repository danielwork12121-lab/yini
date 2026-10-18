import { z } from 'zod';
import { AnalyzeRequestSchema, AnalyzeResponseSchema } from '../../contract/api';
import { defineAction } from '../define';

const NIGHTLY_WRITES = ['analysisRun', 'dailyFeedback', 'journalEntry'] as const;
const NIGHTLY_READS = ['connection', 'connectionMember', 'profile', 'journalEntry', 'analysisRun'] as const;
const NIGHTLY_MODEL_ACCESS =
  'The nightly agent reads both people\'s raw text for the day, their recent ai_summary lines and the last pair_summary, and may call three pair-scoped read tools. Nobody triggers it from their own session. Each person\'s feedback is shingle-checked against the OTHER person\'s raw text, then (with a real provider) adversarially checked, before insert.';

export const runNightlySweep = defineAction({
  apiName: 'runNightlySweep',
  title: 'Nightly sweep (cron)',
  description: 'Vercel Cron calls this once a day. For every connection with two members and mediation not paused, analyse its target day (yesterday in side A\'s timezone) unless that day already has a finished run.',
  actor: 'cron',
  route: { method: 'GET', path: '/api/cron/nightly' },
  input: z.object({}),
  inputFrom: 'none',
  output: AnalyzeResponseSchema,
  writes: NIGHTLY_WRITES,
  reads: NIGHTLY_READS,
  modelAccess: NIGHTLY_MODEL_ACCESS,
  invariants: ['Idempotent per (connection, day). Running it twice does nothing the second time.'],
});

export const analyzeNow = defineAction({
  apiName: 'analyzeNow',
  title: 'Analyse now (admin)',
  description: 'Operator trigger for the same pipeline: one connection or all, any day, optionally forced.',
  actor: 'admin',
  route: { method: 'POST', path: '/api/admin/analyze' },
  input: AnalyzeRequestSchema,
  inputFrom: 'json',
  output: AnalyzeResponseSchema,
  writes: NIGHTLY_WRITES,
  reads: NIGHTLY_READS,
  modelAccess: NIGHTLY_MODEL_ACCESS,
});
