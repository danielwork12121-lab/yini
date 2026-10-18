/**
 * Audio in, text out.
 *
 * The audio is the artifact and the transcript is a convenience layer, so a
 * transcription failure returns 200 with `failed: true` and an empty string —
 * the client keeps the recording and lets the user type instead. It never 500s
 * in a way that loses what someone just said.
 */
import OpenAI from 'openai';
import type { TranscribeResponse } from '@/contract';
import { actionTypes } from '@/ontology';
import { actionRoute } from '@/lib/http/action-route';
import { env } from '@/lib/env';
import { geminiFetch } from '@/lib/llm/geminiFetch';

export const maxDuration = 60;

export const POST = actionRoute(actionTypes.transcribe, async ({ input }): Promise<TranscribeResponse> => {
  const { audio: file, duration_ms: durationMs } = input;
  const miss = (): TranscribeResponse => ({ text: '', duration_ms: durationMs, audio_path: null, failed: true });

  try {
    if (env.openaiKey()) {
      const out = await new OpenAI({ apiKey: env.openaiKey()! }).audio.transcriptions.create({
        file, model: process.env.OPENAI_TRANSCRIBE_MODEL ?? 'whisper-1',
      });
      return { text: out.text ?? '', duration_ms: durationMs, audio_path: null, failed: false };
    }

    if (env.geminiKey()) {
      // Gemini takes audio natively, so one key covers transcription and reasoning.
      const b64 = Buffer.from(await file.arrayBuffer()).toString('base64');
      const res = await geminiFetch(process.env.GEMINI_TRANSCRIBE_MODEL ?? 'gemini-2.5-flash', {
        contents: [{
          role: 'user',
          parts: [
            { text: 'Transcribe this audio verbatim. Return only the words spoken, with no commentary, labels or timestamps.' },
            { inlineData: { mimeType: file.type || 'audio/webm', data: b64 } },
          ],
        }],
      });
      if (!res.ok) return miss();
      const json = await res.json();
      const text = json?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('').trim() ?? '';
      return { text, duration_ms: durationMs, audio_path: null, failed: !text };
    }

    return miss();
  } catch (e) {
    console.error('[transcribe]', e);
    return miss();
  }
});
