/**
 * Audio in, text out.
 *
 * The audio is the artifact and the transcript is a convenience layer, so a
 * transcription failure returns 200 with `failed: true` and an empty string —
 * the client keeps the recording and lets the user type instead. It never 500s
 * in a way that loses what someone just said.
 */
import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import type { TranscribeResponse } from '@/contract';
import { createServerSupabase } from '@/lib/supabase/server';
import { env } from '@/lib/env';

export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sign in first', code: 'unauthenticated', recoverable: false }, { status: 401 });

  const form = await request.formData();
  const file = form.get('audio');
  const durationMs = Number(form.get('duration_ms') ?? 0);
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No audio', code: 'invalid_input', recoverable: true }, { status: 400 });
  }

  const miss = (): NextResponse =>
    NextResponse.json({ text: '', duration_ms: durationMs, audio_path: null, failed: true } satisfies TranscribeResponse);

  try {
    if (env.openaiKey()) {
      const out = await new OpenAI({ apiKey: env.openaiKey()! }).audio.transcriptions.create({
        file, model: process.env.OPENAI_TRANSCRIBE_MODEL ?? 'whisper-1',
      });
      return NextResponse.json({ text: out.text ?? '', duration_ms: durationMs, audio_path: null, failed: false } satisfies TranscribeResponse);
    }

    if (env.geminiKey()) {
      // Gemini takes audio natively, so one key covers transcription and reasoning.
      const b64 = Buffer.from(await file.arrayBuffer()).toString('base64');
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_TRANSCRIBE_MODEL ?? 'gemini-2.5-flash'}:generateContent`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-goog-api-key': env.geminiKey()! },
          body: JSON.stringify({
            contents: [{
              role: 'user',
              parts: [
                { text: 'Transcribe this audio verbatim. Return only the words spoken, with no commentary, labels or timestamps.' },
                { inlineData: { mimeType: file.type || 'audio/webm', data: b64 } },
              ],
            }],
          }),
        },
      );
      if (!res.ok) return miss();
      const json = await res.json();
      const text = json?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('').trim() ?? '';
      return NextResponse.json({ text, duration_ms: durationMs, audio_path: null, failed: !text } satisfies TranscribeResponse);
    }

    return miss();
  } catch (e) {
    console.error('[transcribe]', e);
    return miss();
  }
}
