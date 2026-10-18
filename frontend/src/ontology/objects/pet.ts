import { z } from 'zod';
import { PET_SPECIES } from '../../contract/enums';
import { defineObject } from '../define';
import { zTimestamp, zUuid } from './_fields';

export const PetSchema = z.object({
  connection_id: zUuid,
  name: z.string().min(1).max(24),
  species: z.enum(PET_SPECIES).nullable().describe('The buddy picked at sign-up. Null only if none was picked. Not shown until the egg hatches.'),
  hatched_at: zTimestamp.nullable().describe('Set on the first day BOTH people logged.'),
  xp: z.number().int().nonnegative().default(0).describe('Follow-through on nudges and quests. Separate from feedings, which are attendance.'),
  created_at: zTimestamp,
}).describe('The shared pet. Identity only; progression is derived.');
export type Pet = z.infer<typeof PetSchema>;

export const pet = defineObject({
  apiName: 'pet',
  title: 'Pet',
  table: 'pets',
  primaryKey: ['connection_id'],
  description: 'The only honest shared object in the product. It reveals nothing private about either person.',
  schema: PetSchema,
  visibility: 'members',
  crossesBoundary: false,
  invariants: ['No column anyone could decrement. "Never dies" is a property of the schema.'],
});

/** Derived, never stored. Computed by `derivePetState()`. */
export const PetStateSchema = z.object({
  name: z.string(),
  species: z.string().nullable(),
  hatched: z.boolean(),
  total_half_days: z.number().int().nonnegative(),
  xp: z.number().int().nonnegative(),
  stage: z.number().int().min(0).max(4),
  stage_key: z.string(),
  bond_level: z.number().int().min(0).max(10),
  bond_name: z.string(),
  next_threshold: z.number().int().nullable(),
  you_fed_today: z.boolean().describe('Whether YOU fed today. We never report whether your partner did.'),
  both_fed_today: z.boolean().describe('True only when both halves are in. Drives the paired animation.'),
}).describe('What the client renders for the pet, derived on every read.');
export type PetState = z.infer<typeof PetStateSchema>;

export const petState = defineObject({
  apiName: 'petState',
  title: 'Pet state (derived)',
  table: null,
  primaryKey: [],
  description: 'Computed from pet + pet feedings by derivePetState(). Nothing stored means nothing can desync.',
  schema: PetStateSchema,
  visibility: 'members',
  crossesBoundary: false,
});
