import { z } from 'zod';
import { CARE_ACT_SOURCES } from '../../contract/enums';
import { defineObject } from '../define';
import { zLocalDate, zTimestamp, zUuid } from './_fields';

export const CareActSchema = z.object({
  id: zUuid,
  connection_id: zUuid,
  actor_id: zUuid.describe('Who did it.'),
  beneficiary_id: zUuid.describe('Who it was for.'),
  source: z.enum(CARE_ACT_SOURCES),
  source_entry_id: zUuid.nullable().describe('SERVER ONLY.'),
  source_nudge_id: zUuid.nullable(),

  source_span: z.string().min(1).max(300).describe('Verified substring of the actor\'s own text. Never shown raw; proves the act happened.'),
  description: z.string().min(1).max(160).describe('Third-person rendering shown in the reveal, e.g. "covered dinner twice".'),

  occurred_on: zLocalDate,
  revealed_at: zTimestamp.nullable(),
  created_at: zTimestamp,
}).describe('Something one person actually did for the other.');
export type CareAct = z.infer<typeof CareActSchema>;

export const careAct = defineObject({
  apiName: 'careAct',
  title: 'Care act',
  table: 'care_acts',
  primaryKey: ['id'],
  description: 'The invisible labour the reveal makes visible. Nothing lands here without a verbatim evidence span.',
  schema: CareActSchema,
  visibility: 'server',
  crossesBoundary: true,
  serverOnlyFields: ['source_span', 'source_entry_id'],
  invariants: ['Ungranted to every client role. The reveal is server-rendered prose.'],
});
