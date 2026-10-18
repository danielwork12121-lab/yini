import { z } from 'zod';
import { ClockResponseSchema } from '../../contract/api';
import { defineAction } from '../define';

export const getClock = defineAction({
  apiName: 'getClock',
  title: 'Get the testing clock',
  description: 'How many whole days the app has been fast-forwarded. Everyone\'s "today" is their own local day plus this number. The number is public and says nothing about anyone.',
  actor: 'public',
  route: { method: 'GET', path: '/api/clock' },
  input: z.object({}),
  inputFrom: 'none',
  output: ClockResponseSchema,
  writes: [],
  reads: ['appClock'],
  invariants: [
    'Read-only. The clock is moved by hand in the Supabase SQL editor, never through the app.',
    'If the table does not exist yet, the answer is 0 and the app behaves as if nothing was ever fast-forwarded.',
  ],
});
