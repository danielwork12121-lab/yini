import { CalendarQuerySchema, CalendarResponseSchema, DayMoodRequestSchema, DayMoodResponseSchema } from '../../contract/api';
import { defineAction } from '../define';

export const getCalendar = defineAction({
  apiName: 'getCalendar',
  title: 'Get my calendar month',
  description: 'One month of your own calendar: a mood face and short jot notes per day, what you said that day, and the little steps from Grow you did.',
  actor: 'user',
  route: { method: 'GET', path: '/api/calendar' },
  input: CalendarQuerySchema,
  inputFrom: 'query',
  output: CalendarResponseSchema,
  writes: [],
  reads: ['moodDay', 'journalEntry', 'growDone'],
  invariants: [
    'Runs through the user\'s own Supabase client, so RLS (author_id = auth.uid()) is what filters it. A partner\'s days never appear.',
  ],
});

export const setDayMood = defineAction({
  apiName: 'setDayMood',
  title: 'Change a day\'s mood',
  description: 'Replaces the face Yini picked for one of your days with the one you choose. It is marked as changed by you.',
  actor: 'user',
  route: { method: 'POST', path: '/api/calendar/mood' },
  input: DayMoodRequestSchema,
  inputFrom: 'json',
  output: DayMoodResponseSchema,
  writes: ['moodDay'],
  reads: ['moodDay'],
  invariants: ['Runs through the user\'s own client, so RLS (author_id = auth.uid()) means it can only change their own day.'],
});
