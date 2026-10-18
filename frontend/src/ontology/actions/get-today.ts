import { z } from 'zod';
import { TodayResponseSchema } from '../../contract/api';
import { defineAction } from '../define';

export const getToday = defineAction({
  apiName: 'getToday',
  title: 'Get today',
  description: 'Everything the home screen needs: whether you checked in, the pet, today\'s nudge, the shared streak.',
  actor: 'user',
  route: { method: 'GET', path: '/api/today' },
  input: z.object({}),
  inputFrom: 'none',
  output: TodayResponseSchema,
  writes: [],
  reads: ['profile', 'connection', 'connectionMember', 'pet', 'petFeeding', 'journalEntry', 'nudge'],
  invariants: ['Never says whether the partner checked in. The streak counts shared days only.'],
});
