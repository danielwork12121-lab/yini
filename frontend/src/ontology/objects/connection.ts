import { z } from 'zod';
import { CONNECTION_KINDS } from '../../contract/enums';
import { defineObject } from '../define';
import { zTimestamp, zUuid } from './_fields';

export const ConnectionSchema = z.object({
  id: zUuid,
  kind: z.enum(CONNECTION_KINDS).default('partner').describe('The relationship type. The hackathon UI ships partner only.'),
  invite_code: z.string().length(6).describe('Read aloud to the other person. No I, O, 0 or 1.'),
  mediation_paused_at: zTimestamp.nullable().describe('Non-null the moment anything trips fear/coercion/abuse. All mediation stops, including the nightly run.'),
  created_at: zTimestamp,
}).describe('A sealed relationship between exactly two people.');
export type Connection = z.infer<typeof ConnectionSchema>;

export const connection = defineObject({
  apiName: 'connection',
  title: 'Connection',
  table: 'connections',
  primaryKey: ['id'],
  description: 'A pair. A user may have many; they share nothing with each other.',
  schema: ConnectionSchema,
  visibility: 'members',
  crossesBoundary: false,
  invariants: ['A trigger caps membership at two rows.'],
});
