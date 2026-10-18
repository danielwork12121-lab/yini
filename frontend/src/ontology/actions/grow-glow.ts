import { z } from 'zod';
import { GlowResponseSchema, GrowDoneRequestSchema, GrowDoneResponseSchema, GrowResponseSchema } from '../../contract/api';
import { defineAction } from '../define';

export const getGrow = defineAction({
  apiName: 'getGrow',
  title: 'Get my Grow',
  description: 'Small things you could do for the relationship, written overnight from both people\'s logs. Also nudges the overnight read to start if a finished day has not been read yet.',
  actor: 'user',
  route: { method: 'GET', path: '/api/grow' },
  input: z.object({}),
  inputFrom: 'none',
  output: GrowResponseSchema,
  writes: ['analysisRun', 'dailyFeedback', 'journalEntry'],
  reads: ['dailyFeedback', 'nudge', 'analysisRun', 'journalEntry', 'growDone', 'profile', 'connectionMember'],
  modelAccess: 'Only when it starts the overnight read, and then exactly what runNightlySweep sees. The response itself carries just the recipient\'s own feedback rows and the already leak-checked nudges.',
  invariants: [
    'Feedback and nudges are read through the user\'s own client, so RLS (recipient_id = auth.uid()) is what filters them.',
    'Starting the read is idempotent per (connection, day): a finished or already-running day is never started twice, and a failed one waits a few minutes before it retries.',
    'The read runs after the response is sent, so opening Grow never waits on a model.',
    'A day that already has a finished read is read again when something new was saved after it, so Grow keeps up with the day.',
  ],
});

export const setGrowDone = defineAction({
  apiName: 'setGrowDone',
  title: 'Tick off a Grow suggestion',
  description: 'Marks one of your own Grow suggestions as done, or takes that back. Done ones move to a quiet list at the bottom of Grow.',
  actor: 'user',
  route: { method: 'POST', path: '/api/grow/done' },
  input: GrowDoneRequestSchema,
  inputFrom: 'json',
  output: GrowDoneResponseSchema,
  writes: ['growDone'],
  reads: ['dailyFeedback', 'growDone', 'profile'],
  invariants: [
    'Only text that is one of the caller\'s own current daily_feedback bullets can be ticked off. Anything else is refused.',
    'Taking it back deletes only the caller\'s own row. Ticking twice is one row.',
  ],
});

export const getGlow = defineAction({
  apiName: 'getGlow',
  title: 'Get my Glow',
  description: 'The kind things your partner has said about you, in their own words. Opening it marks them surfaced.',
  actor: 'user',
  route: { method: 'GET', path: '/api/glow' },
  input: z.object({}),
  inputFrom: 'none',
  output: GlowResponseSchema,
  writes: ['kindWord'],
  reads: ['kindWord', 'journalEntry', 'profile', 'connectionMember'],
  invariants: [
    'Only rows where recipient_id is the caller, and only ones the extractor verified as a literal substring of what the author wrote.',
    'Nothing about the entry other than the day it was written is sent: no entry text, no id.',
    'status moves approved → surfaced the first time the recipient opens Glow, which is what the kind_words RLS policy waits for.',
  ],
});
