import { z } from 'zod';
import { defineObject } from '../define';
import { zTimestamp, zUuid } from './_fields';

export const NudgeMessageSchema = z.object({
  id: zUuid,
  nudge_id: zUuid,
  role: z.enum(['user', 'coach']).describe('The coach only. This thread never reaches the partner, in either direction.'),
  body: z.string().min(1).max(4000),
  created_at: zTimestamp,
}).describe('The focused chat under a nudge: "how do I actually move forward on this?"');
export type NudgeMessage = z.infer<typeof NudgeMessageSchema>;

export const nudgeMessage = defineObject({
  apiName: 'nudgeMessage',
  title: 'Nudge message',
  table: 'nudge_messages',
  primaryKey: ['id'],
  description: 'A private coaching thread attached to one nudge.',
  schema: NudgeMessageSchema,
  visibility: 'recipient',
  crossesBoundary: false,
});
