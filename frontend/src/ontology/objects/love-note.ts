import { z } from 'zod';
import { defineObject } from '../define';
import { zTimestamp, zUuid } from './_fields';

export const LoveNoteSchema = z.object({
  id: zUuid,
  connection_id: zUuid,
  sender_id: zUuid,
  recipient_id: zUuid,
  title: z.string().max(60).nullable().describe('Optional heading the sender gave it.'),
  body: z.string().max(4000).describe('The note, word for word. For a voice note, the transcript the sender confirmed.'),
  voice_path: z.string().nullable().describe('Where the voice recording lives in the private love-voice bucket. Never sent to a client; the recipient gets a short-lived link instead.'),
  voice_ms: z.number().int().nonnegative().nullable(),
  is_favorite: z.boolean().describe('Set by the recipient only.'),
  seen_at: zTimestamp.nullable().describe('When the recipient first opened Glow after it arrived.'),
  created_at: zTimestamp,
}).describe('Something one person chose to send to the other: words, and optionally their voice.');
export type LoveNote = z.infer<typeof LoveNoteSchema>;

export const loveNote = defineObject({
  apiName: 'loveNote',
  title: 'Love note',
  table: 'love_notes',
  primaryKey: ['id'],
  description: 'A note one person writes or speaks on purpose and sends to their person. The recipient keeps it, can favorite it, and the sender can look back at what they sent.',
  schema: LoveNoteSchema,
  visibility: 'server',
  crossesBoundary: true,
  serverOnlyFields: ['voice_path'],
  invariants: [
    'Written only by the sender, with their own words (typed, or transcribed from their own voice and confirmed by them). No model writes or rewrites it.',
    'Nothing is sent until the sender confirms. The recipient sees exactly what was confirmed.',
    'No client grant and no policy. The API returns a note only to its sender or its recipient, and only the recipient may favorite it.',
    'Voice recordings sit in a private bucket and reach the recipient through a one-hour signed link.',
  ],
});
