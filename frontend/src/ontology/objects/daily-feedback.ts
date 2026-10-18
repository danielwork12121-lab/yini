import { z } from 'zod';
import { LEAK_VERDICTS } from '../../contract/enums';
import { defineObject } from '../define';
import { zLocalDate, zTimestamp, zUuid } from './_fields';

export const DailyFeedbackSchema = z.object({
  id: zUuid,
  run_id: zUuid,
  connection_id: zUuid,
  recipient_id: zUuid.describe('The one person who may read this row.'),
  local_date: zLocalDate.describe('The day the feedback is about.'),
  headline: z.string().min(1).max(160),
  bullets: z.array(z.string().min(1).max(400)).min(1).max(5).describe('2-5 concrete, kind, doable things, in the second person.'),
  leak_dropped: z.number().int().nonnegative().default(0).describe('Bullets removed because they shared 6+ consecutive words with the partner\'s raw text.'),
  leak_verdict: z.enum(LEAK_VERDICTS).default('skipped').describe('Result of the adversarial reconstruction check on the final text.'),
  created_at: zTimestamp,
}).describe("The nightly agent's private feedback for one person.");
export type DailyFeedback = z.infer<typeof DailyFeedbackSchema>;

export const dailyFeedback = defineObject({
  apiName: 'dailyFeedback',
  title: 'Daily feedback',
  table: 'daily_feedback',
  primaryKey: ['id'],
  description: 'Lands the morning after: cross-partner mediation written from both diaries, without revealing either.',
  schema: DailyFeedbackSchema,
  visibility: 'recipient',
  crossesBoundary: true,
  invariants: [
    'UNIQUE(recipient_id, connection_id, local_date).',
    'Every bullet passed the shingle check against the partner\'s raw text; the whole text passed the adversarial check or was replaced with self-care.',
    'Published to Supabase Realtime, which applies the same RLS, so only the recipient is notified.',
  ],
});
