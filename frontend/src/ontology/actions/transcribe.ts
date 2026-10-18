import { z } from 'zod';
import { TranscribeResponseSchema } from '../../contract/api';
import { defineAction } from '../define';

export const TranscribeInputSchema = z.object({
  audio: z.instanceof(File, { message: 'No audio' }).describe('webm, mp4 or wav, up to 25MB.'),
  duration_ms: z.coerce.number().int().nonnegative().default(0),
});

export const transcribe = defineAction({
  apiName: 'transcribe',
  title: 'Transcribe audio',
  description: 'Audio in, text out. A failure returns 200 with failed: true so the client keeps the recording and offers typing.',
  actor: 'user',
  route: { method: 'POST', path: '/api/transcribe' },
  input: TranscribeInputSchema,
  inputFrom: 'multipart',
  output: TranscribeResponseSchema,
  writes: [],
  reads: [],
  modelAccess: 'Whisper or Gemini sees the audio of the caller\'s own entry.',
});
