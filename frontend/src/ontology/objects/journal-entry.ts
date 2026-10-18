import { z } from 'zod';
import { EMOTIONAL_STATES, INPUT_MODES, SAFETY_FLAGS, THEMES } from '../../contract/enums';
import { defineObject } from '../define';
import { zLocalDate, zSeverity, zTimestamp, zUuid } from './_fields';

export const JournalEntrySchema = z.object({
  id: zUuid,
  author_id: zUuid,
  connection_id: zUuid,
  local_date: zLocalDate.describe("The author's local day. Several entries on one day are allowed; the nightly run reads them all."),

  raw_text: z.string().min(1).max(8000).describe("The user's own words. The AI never writes into this column."),
  input_mode: z.enum(INPUT_MODES),
  audio_path: z.string().nullable().describe('Storage key; the audio is the artifact.'),
  audio_duration_ms: z.number().int().nonnegative().nullable(),
  transcript_failed: z.boolean().default(false).describe('The entry still saves; the transcript is a convenience.'),

  state: z.enum(EMOTIONAL_STATES).nullable().describe('Classifier output, as private as the text.'),
  severity: zSeverity.nullable(),
  themes: z.array(z.enum(THEMES)).max(3).default([]),
  mood_face: z.number().int().min(1).max(5).nullable(),
  safety_flag: z.enum(SAFETY_FLAGS).default('none'),
  classifier_model: z.string().nullable(),
  classified_at: zTimestamp.nullable(),

  ai_summary: z.string().max(600).nullable().describe('2-3 sentence third-person summary written by the nightly agent. This is the per-person memory later runs read instead of old raw text.'),

  created_at: zTimestamp,
}).describe('A private journal entry.');
export type JournalEntry = z.infer<typeof JournalEntrySchema>;

export const journalEntry = defineObject({
  apiName: 'journalEntry',
  title: 'Journal entry',
  table: 'entries',
  primaryKey: ['id'],
  description: 'What one person wrote or said on one day. The most protected object in the system.',
  schema: JournalEntrySchema,
  visibility: 'author',
  crossesBoundary: false,
  invariants: [
    'RLS: author_id = auth.uid() for select/insert/update/delete. No policy lets a partner select this row.',
    'raw_text reaches a model in exactly two places: the classifier inside the author\'s own check-in, and the nightly agent, which no user triggers and whose output is leak-checked twice.',
  ],
});
