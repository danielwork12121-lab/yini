import { z } from 'zod';
import { defineObject } from '../define';
import { zTimestamp, zUuid } from './_fields';

export const QuestSchema = z.object({
  id: zUuid,
  connection_id: zUuid,
  author_id: zUuid,
  prompt_key: z.string().min(1).max(60),
  prompt_text: z.string().min(1).max(300),
  completed_at: zTimestamp.nullable(),
  created_at: zTimestamp,
}).describe('A short prompt that banks compliments for the other person and feeds the pet.');
export type Quest = z.infer<typeof QuestSchema>;

export const quest = defineObject({
  apiName: 'quest',
  title: 'Quest',
  table: 'quests',
  primaryKey: ['id'],
  description: 'Keeps the supply of kind words from running dry.',
  schema: QuestSchema,
  visibility: 'author',
  crossesBoundary: false,
});
