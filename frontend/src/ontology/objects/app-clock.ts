import { z } from 'zod';
import { defineObject } from '../define';
import { zTimestamp } from './_fields';

export const AppClockSchema = z.object({
  id: z.number().int().min(1).max(1).describe('Always 1. There is exactly one clock.'),
  day_offset: z.number().int().min(-400).max(400).describe('Whole days added to "today" for every user. 0 in normal life.'),
  updated_at: zTimestamp,
}).describe('The testing clock: how many days the whole app has been fast-forwarded.');
export type AppClock = z.infer<typeof AppClockSchema>;

export const appClock = defineObject({
  apiName: 'appClock',
  title: 'App clock',
  table: 'app_clock',
  primaryKey: ['id'],
  description: 'A single row that moves "today" forwards for everyone, so a demo can skip to the next day. Moved by hand from the Supabase SQL editor, never from inside the app.',
  schema: AppClockSchema,
  visibility: 'server',
  crossesBoundary: false,
  invariants: [
    'CHECK (id = 1): one row only.',
    'No client grant and no policy. The browser learns the offset from GET /api/clock, which exposes the number and nothing else.',
  ],
});
