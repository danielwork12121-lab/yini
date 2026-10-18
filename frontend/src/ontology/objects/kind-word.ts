import { z } from 'zod';
import { KIND_WORD_SOURCES, KIND_WORD_STATUSES } from '../../contract/enums';
import { defineObject } from '../define';
import { zTimestamp, zUuid } from './_fields';

export const KindWordSchema = z.object({
  id: zUuid,
  connection_id: zUuid,
  author_id: zUuid.describe('Who said it.'),
  recipient_id: zUuid.describe('Who it is about.'),
  source_entry_id: zUuid.nullable().describe('SERVER ONLY.'),
  quest_id: zUuid.nullable(),
  source: z.enum(KIND_WORD_SOURCES).default('entry'),

  text: z.string().min(1).max(300).describe('Verified literal substring of what the author wrote.'),
  verbatim: z.literal(true).describe('Typed true so a paraphrase cannot be constructed.'),
  status: z.enum(KIND_WORD_STATUSES).default('candidate'),
  surfaced_at: zTimestamp.nullable(),
  created_at: zTimestamp,
}).describe('Something one person actually said about the other, in their own words.');
export type KindWord = z.infer<typeof KindWordSchema>;

export const kindWord = defineObject({
  apiName: 'kindWord',
  title: 'Kind word',
  table: 'kind_words',
  primaryKey: ['id'],
  description: 'The one place a partner\'s literal words reach the other person, deliberately: a paraphrase here would be the app inventing affection.',
  schema: KindWordSchema,
  visibility: 'recipient',
  crossesBoundary: true,
  serverOnlyFields: ['source_entry_id'],
  invariants: ['Readable by the recipient only once status = surfaced.'],
});
