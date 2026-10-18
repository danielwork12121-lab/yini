import { z } from 'zod';
import { CONCERN_STATUSES, HOLD_REASONS, THEMES } from '../../contract/enums';
import { defineObject } from '../define';
import { zSeverity, zTimestamp, zUuid } from './_fields';

export const ConcernSchema = z.object({
  id: zUuid,
  connection_id: zUuid,
  author_id: zUuid.describe('Who needs this. The recipient is the other member.'),
  source_entry_id: zUuid.describe('SERVER ONLY. Never leaves the server.'),

  distilled_text: z.string().min(1).max(200).describe('The need, abstracted: no quotes, names, dates, numbers or incident detail. Length is itself a leak channel.'),
  theme: z.enum(THEMES),
  severity: zSeverity,

  status: z.enum(CONCERN_STATUSES).default('open'),
  times_held: z.number().int().nonnegative().default(0).describe('Days we chose not to deliver. Drives the "stop waiting" rule.'),
  last_hold_reason: z.enum(HOLD_REASONS).nullable(),
  times_raised: z.number().int().positive().default(1).describe('High counts escalate to a staged conversation.'),

  first_raised_at: zTimestamp,
  delivered_at: zTimestamp.nullable(),
  created_at: zTimestamp,
}).describe('A distilled need, derived from one entry at write time.');
export type Concern = z.infer<typeof ConcernSchema>;

export const concern = defineObject({
  apiName: 'concern',
  title: 'Concern',
  table: 'concerns',
  primaryKey: ['id'],
  description: 'The only representation of a need that a partner-facing path may read. What reaches the partner is a nudge built from it, never the row.',
  schema: ConcernSchema,
  visibility: 'author',
  crossesBoundary: true,
  serverOnlyFields: ['source_entry_id'],
  invariants: ['The author may read their own rows ("waiting for a good moment"). The recipient has no policy on this table.'],
});
