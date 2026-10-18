import { z } from 'zod';
import { SAFETY_FLAGS } from '../../contract/enums';
import { defineObject } from '../define';
import { zTimestamp, zUuid } from './_fields';

export const SafetyEventSchema = z.object({
  id: zUuid,
  connection_id: zUuid,
  user_id: zUuid,
  entry_id: zUuid.nullable(),
  flag: z.enum(SAFETY_FLAGS),
  created_at: zTimestamp,
}).describe('Audit trail for safety triage.');
export type SafetyEvent = z.infer<typeof SafetyEventSchema>;

export const safetyEvent = defineObject({
  apiName: 'safetyEvent',
  title: 'Safety event',
  table: 'safety_events',
  primaryKey: ['id'],
  description: 'Written when an entry trips a safety flag. Never rendered to the partner.',
  schema: SafetyEventSchema,
  visibility: 'server',
  crossesBoundary: false,
});
