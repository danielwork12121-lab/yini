import { EntriesQuerySchema, EntriesResponseSchema } from '../../contract/api';
import { defineAction } from '../define';

export const listEntries = defineAction({
  apiName: 'listEntries',
  title: 'List my entries',
  description: 'Your own journal, newest first, with the nightly ai_summary once it exists.',
  actor: 'user',
  route: { method: 'GET', path: '/api/entries' },
  input: EntriesQuerySchema,
  inputFrom: 'query',
  output: EntriesResponseSchema,
  writes: [],
  reads: ['journalEntry'],
  invariants: ['Runs through the user\'s own Supabase client, so RLS (author_id = auth.uid()) is what filters it.'],
});
