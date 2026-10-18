import { z } from 'zod';
import { COACH_TONES } from '../../contract/enums';
import { defineObject } from '../define';
import { zTimestamp, zUuid } from './_fields';

export const ProfileSchema = z.object({
  id: zUuid.describe('Same value as auth.users.id. Supabase owns sign-in; this row owns everything else.'),
  display_name: z.string().min(1).max(40).describe('What the partner sees. The only profile field that ever crosses over, via connection_peers.'),
  timezone: z.string().default('America/Los_Angeles').describe('IANA zone. Decides the local day for check-ins and the nightly run.'),
  default_connection_id: zUuid.nullable().describe('So the daily log opens with zero taps to choose who.'),
  coach_tone: z.enum(COACH_TONES).default('warm').describe('Changes how the coach talks to you. Never what gets delivered.'),
  notify_at: z.string().regex(/^\d{2}:\d{2}$/).default('20:00').describe('Preferred notification window, local HH:MM.'),
  created_at: zTimestamp,
}).describe('A person. Created by a trigger when a Supabase auth user is created.');
export type Profile = z.infer<typeof ProfileSchema>;

export const profile = defineObject({
  apiName: 'profile',
  title: 'Profile',
  table: 'profiles',
  primaryKey: ['id'],
  description: 'One row per person. Identity comes from Supabase Auth; the app never stores a password.',
  schema: ProfileSchema,
  visibility: 'self',
  crossesBoundary: false,
  invariants: [
    'A partner never selects a row here. Their name reaches you through the connection_peers view, one column wide.',
  ],
});
