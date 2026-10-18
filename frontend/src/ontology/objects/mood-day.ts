import { z } from 'zod';
import { defineObject } from '../define';
import { zLocalDate, zTimestamp, zUuid } from './_fields';

export const MoodDaySchema = z.object({
  author_id: zUuid,
  connection_id: zUuid,
  local_date: zLocalDate,
  mood_face: z.number().int().min(1).max(5),
  source: z.enum(['self', 'derived']).default('derived'),
  note: z.string().max(4000).nullable().describe('The day\'s emoji, headline and jot notes, as a small JSON document (see lib/calendar.ts). Older rows are plain text.'),
  created_at: zTimestamp,
}).describe('One face per day on your own calendar.');
export type MoodDay = z.infer<typeof MoodDaySchema>;

export const moodDay = defineObject({
  apiName: 'moodDay',
  title: 'Mood day',
  table: 'mood_days',
  primaryKey: ['author_id', 'connection_id', 'local_date'],
  description: 'Your calendar. There is no partner-visible view.',
  schema: MoodDaySchema,
  visibility: 'author',
  crossesBoundary: false,
});
