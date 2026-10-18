import { CalendarQuerySchema, CalendarResponseSchema } from '../../contract/api';
import { defineAction } from '../define';

export const getCalendar = defineAction({
  apiName: 'getCalendar',
  title: 'Get my calendar month',
  description: 'One month of your own calendar: an emoji and short jot notes per day, plus what you said that day.',
  actor: 'user',
  route: { method: 'GET', path: '/api/calendar' },
  input: CalendarQuerySchema,
  inputFrom: 'query',
  output: CalendarResponseSchema,
  writes: [],
  reads: ['moodDay', 'journalEntry'],
  invariants: [
    'Runs through the user\'s own Supabase client, so RLS (author_id = auth.uid()) is what filters it. A partner\'s days never appear.',
  ],
});
