import { z } from 'zod';
import {
  AnalyzeResponseSchema, FeedbackLatestResponseSchema, FeedbackListQuerySchema,
  FeedbackListResponseSchema, RunMyAnalysisRequestSchema,
} from '../../contract/api';
import { defineAction } from '../define';

export const getLatestFeedback = defineAction({
  apiName: 'getLatestFeedback',
  title: 'Get latest feedback',
  description: 'The most recent nightly feedback written for you. Clients also subscribe to Supabase Realtime on daily_feedback to hear about new rows.',
  actor: 'user',
  route: { method: 'GET', path: '/api/feedback/latest' },
  input: z.object({}),
  inputFrom: 'none',
  output: FeedbackLatestResponseSchema,
  writes: [],
  reads: ['dailyFeedback'],
  invariants: ['Read through the user\'s own client; RLS limits rows to recipient_id = auth.uid().'],
});

export const listFeedback = defineAction({
  apiName: 'listFeedback',
  title: 'List feedback',
  description: 'Your nightly feedback history, newest first.',
  actor: 'user',
  route: { method: 'GET', path: '/api/feedback' },
  input: FeedbackListQuerySchema,
  inputFrom: 'query',
  output: FeedbackListResponseSchema,
  writes: [],
  reads: ['dailyFeedback'],
});

export const runMyAnalysis = defineAction({
  apiName: 'runMyAnalysis',
  title: 'Run tonight\'s analysis now (demo)',
  description: 'Demo mode only. Runs the nightly agent for your own connection on today (or a given day), forced, so a judge sees the cross-partner feedback land without waiting for midnight.',
  actor: 'user',
  route: { method: 'POST', path: '/api/feedback/run' },
  input: RunMyAnalysisRequestSchema,
  inputFrom: 'json',
  output: AnalyzeResponseSchema,
  writes: ['analysisRun', 'dailyFeedback', 'journalEntry'],
  reads: ['connection', 'connectionMember', 'profile', 'journalEntry', 'analysisRun'],
  modelAccess: 'Same as runNightlySweep.',
  invariants: ['403 unless NEXT_PUBLIC_DEMO_MODE=true.'],
});
