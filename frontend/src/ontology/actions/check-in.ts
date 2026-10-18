import { CheckinRequestSchema, CheckinResponseSchema } from '../../contract/api';
import { defineAction } from '../define';

export const checkIn = defineAction({
  apiName: 'checkIn',
  title: 'Check in',
  description: 'Save today\'s entry and reply in the same breath: classify, feed the pet, decide whether one partner item can land, compose, leak-check.',
  actor: 'user',
  route: { method: 'POST', path: '/api/checkin' },
  input: CheckinRequestSchema,
  inputFrom: 'json',
  output: CheckinResponseSchema,
  writes: ['journalEntry', 'moodDay', 'petFeeding', 'pet', 'concern', 'kindWord', 'careAct', 'nudge', 'safetyEvent', 'connection'],
  reads: ['profile', 'connection', 'connectionMember', 'concern', 'careAct', 'nudge', 'petFeeding', 'pet'],
  modelAccess: 'The classifier sees the author\'s own raw text, inside the author\'s own request. The composer sees distilled concerns and the author\'s own words, never the partner\'s raw text. The leak checker sees only the finished output.',
  invariants: [
    'The entry is saved before any model call, so an outage costs the reply, never the journal.',
    'Safety is checked before any mediation work exists to leak.',
    'At most one partner item per recipient per day.',
  ],
});
