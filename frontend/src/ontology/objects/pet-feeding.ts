import { z } from 'zod';
import { defineObject } from '../define';
import { zLocalDate, zTimestamp, zUuid } from './_fields';

export const PetFeedingSchema = z.object({
  connection_id: zUuid,
  local_date: zLocalDate,
  author_id: zUuid,
  created_at: zTimestamp,
}).describe('One row per person per day they showed up.');
export type PetFeeding = z.infer<typeof PetFeedingSchema>;

export const petFeeding = defineObject({
  apiName: 'petFeeding',
  title: 'Pet feeding',
  table: 'pet_feedings',
  primaryKey: ['connection_id', 'local_date', 'author_id'],
  description: 'Attendance. Inserted on any completed check-in regardless of mood; a brutal day feeds the pet exactly as well as a great one.',
  schema: PetFeedingSchema,
  visibility: 'members',
  crossesBoundary: false,
  invariants: ['Rows are never deleted.'],
});
