import { z } from 'zod';
import { defineObject } from '../define';
import { zTimestamp, zUuid } from './_fields';

export const GrowDoneSchema = z.object({
  id: zUuid,
  recipient_id: zUuid,
  connection_id: zUuid,
  body_text: z.string().min(1).max(900).describe('The Grow suggestion, word for word, as it stood when it was ticked off.'),
  done_at: zTimestamp,
}).describe('A Grow suggestion one person has marked as done.');
export type GrowDone = z.infer<typeof GrowDoneSchema>;

export const growDone = defineObject({
  apiName: 'growDone',
  title: 'Grow: done',
  table: 'grow_done',
  primaryKey: ['id'],
  description: 'Which Grow suggestions someone has done. Keyed by the suggestion\'s words, so it survives Yini rewriting a day\'s list.',
  schema: GrowDoneSchema,
  visibility: 'server',
  crossesBoundary: false,
  invariants: [
    'UNIQUE(recipient_id, body_text): ticking the same suggestion twice is one row.',
    'No client grant and no policy. Only POST /api/grow/done writes it, and only for text that is one of the caller\'s own daily_feedback bullets.',
  ],
});
