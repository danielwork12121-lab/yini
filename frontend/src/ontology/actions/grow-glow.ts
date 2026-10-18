import { z } from 'zod';
import {
  GlowResponseSchema, GrowDoneRequestSchema, GrowDoneResponseSchema, GrowItemRequestSchema, GrowItemResponseSchema, GrowResponseSchema,
  LoveFavoriteRequestSchema, LoveFavoriteResponseSchema, LoveNotesResponseSchema, LoveSendResponseSchema,
} from '../../contract/api';
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

export const updateGrowItem = defineAction({
  apiName: 'updateGrowItem',
  title: 'Bookmark, do, skip or reflect on a Grow suggestion',
  description: 'Bookmarks one of your own Grow suggestions (it stays at the top), marks it done or skipped, takes that back, and saves how it went. Send only what changes.',
  actor: 'user',
  route: { method: 'POST', path: '/api/grow/item' },
  input: GrowItemRequestSchema,
  inputFrom: 'json',
  output: GrowItemResponseSchema,
  writes: ['growDone'],
  reads: ['dailyFeedback', 'growDone', 'profile'],
  invariants: [
    'Only text that is one of the caller\'s own current daily_feedback bullets can be bookmarked, done or skipped. Anything else is refused.',
    'A reflection is private to its writer. The calendar shows it to them alone.',
    'Taking a status back clears its outcome and reflection. A row with nothing left on it is deleted.',
  ],
});

export const getLoveNotes = defineAction({
  apiName: 'getLoveNotes',
  title: 'Get my love notes',
  description: 'The notes your person sent you, and the ones you sent them. Opening it marks new ones seen.',
  actor: 'user',
  route: { method: 'GET', path: '/api/love' },
  input: z.object({}),
  inputFrom: 'none',
  output: LoveNotesResponseSchema,
  writes: ['loveNote'],
  reads: ['loveNote', 'profile', 'connectionMember'],
  invariants: [
    'Only rows where the caller is the sender or the recipient. Favorites on sent notes are never shown to the sender.',
    'Voice notes come back as short-lived signed links, never as storage paths.',
  ],
});

export const LoveSendInputSchema = z.object({
  title: z.string().max(60).optional(),
  body: z.string().max(4000).default(''),
  audio: z.instanceof(File).optional().describe('webm, mp4 or wav, up to 3 minutes.'),
  duration_ms: z.coerce.number().int().nonnegative().default(0),
});

export const sendLoveNote = defineAction({
  apiName: 'sendLoveNote',
  title: 'Send a love note',
  description: 'Sends your person a note you wrote, or a voice note you recorded and confirmed. Goes to them as it is.',
  actor: 'user',
  route: { method: 'POST', path: '/api/love' },
  input: LoveSendInputSchema,
  inputFrom: 'multipart',
  output: LoveSendResponseSchema,
  writes: ['loveNote'],
  reads: ['profile', 'connectionMember'],
  invariants: [
    'The recipient is always the other person in the caller\'s connection. It cannot be aimed anywhere else.',
    'A note needs words or a recording. The words are stored exactly as sent; no model reads or changes them.',
  ],
});

export const setLoveFavorite = defineAction({
  apiName: 'setLoveFavorite',
  title: 'Favorite a love note',
  description: 'Keeps a note you received close, or lets it go.',
  actor: 'user',
  route: { method: 'POST', path: '/api/love/favorite' },
  input: LoveFavoriteRequestSchema,
  inputFrom: 'json',
  output: LoveFavoriteResponseSchema,
  writes: ['loveNote'],
  reads: ['loveNote'],
  invariants: ['Only the recipient of a note may favorite it. The sender never sees whether it was.'],
});
