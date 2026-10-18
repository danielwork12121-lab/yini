import { z } from 'zod';
import { defineObject } from '../define';
import { zTimestamp, zUuid } from './_fields';

export const GrowDoneSchema = z.object({
  id: zUuid,
  recipient_id: zUuid,
  connection_id: zUuid,
  body_text: z.string().min(1).max(900).describe('The Grow suggestion, word for word, as it stood when it was ticked off.'),
  saved: z.boolean().describe('Bookmarked: it stays at the top of Grow.'),
  status: z.enum(['done', 'skipped']).nullable().describe('null while it is still open.'),
  outcome: z.enum(['went_well', 'okay', 'hard', 'no_time', 'not_right']).nullable().describe('How it went, from the reflection.'),
  reflection: z.string().max(600).nullable().describe('What they wanted Yini to remember. Only they see it.'),
  done_at: zTimestamp.nullable(),
  done_on: z.string().nullable().describe('The app-clock day it was done, so the calendar can place it.'),
  updated_at: zTimestamp,
}).describe('What one person did with a Grow suggestion: bookmarked it, did it, skipped it, and how it went.');
export type GrowDone = z.infer<typeof GrowDoneSchema>;

export const growDone = defineObject({
  apiName: 'growDone',
  title: 'Grow: what you did',
  table: 'grow_done',
  primaryKey: ['id'],
  description: 'What someone did with each Grow suggestion. Keyed by the suggestion\'s words, so it survives Yini rewriting a day\'s list.',
  schema: GrowDoneSchema,
  visibility: 'server',
  crossesBoundary: false,
  invariants: [
    'UNIQUE(recipient_id, body_text): ticking the same suggestion twice is one row.',
    'No client grant and no policy. Only POST /api/grow/item writes it, and only for text that is one of the caller\'s own daily_feedback bullets.',
    'A row with nothing on it (not bookmarked, no status) is deleted, so the table only holds things someone actually touched.',
  ],
});
