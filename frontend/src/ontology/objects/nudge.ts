import { z } from 'zod';
import { LEAK_VERDICTS, NUDGE_KINDS, NUDGE_STATUSES, THEMES } from '../../contract/enums';
import { defineObject } from '../define';
import { zLocalDate, zTimestamp, zUuid } from './_fields';

export const NudgeSchema = z.object({
  id: zUuid,
  connection_id: zUuid,
  recipient_id: zUuid,
  concern_id: zUuid.nullable().describe('Null for self_care, context and reveal.'),
  kind: z.enum(NUDGE_KINDS),

  body_text: z.string().min(1).max(900).describe('Written for the recipient, framed as something that helps them. Never quotes the partner.'),
  delivered_on: zLocalDate.describe("Recipient's local day."),
  theme: z.enum(THEMES).nullable(),

  status: z.enum(NUDGE_STATUSES).default('new'),
  acted_at: zTimestamp.nullable(),
  acted_note: z.string().max(2000).nullable().describe("The recipient's own words about what they did."),

  leak_verdict: z.enum(LEAK_VERDICTS).default('skipped'),
  leak_score: z.number().min(0).max(1).nullable(),
  leak_rewrites: z.number().int().nonnegative().default(0),

  created_at: zTimestamp,
}).describe('One delivered item for the recipient, produced during a check-in.');
export type Nudge = z.infer<typeof NudgeSchema>;

export const nudge = defineObject({
  apiName: 'nudge',
  title: 'Nudge',
  table: 'nudges',
  primaryKey: ['id'],
  description: 'The immediate, same-breath output of a check-in that is meant for one person.',
  schema: NudgeSchema,
  visibility: 'recipient',
  crossesBoundary: true,
  invariants: ['Passed the adversarial leak check (or was dropped) before insert.'],
});
