'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

export const VOICE_MAX_MS = 3 * 60_000;
const MIN_MS = 1_000;
const BITS = 24_000;

export type VoicePhase = 'idle' | 'recording' | 'transcribing' | 'ready';

/**
 * Records a voice note and turns it into words. The recording is kept either way: if the
 * words cannot be made out, the person can type them and still send their voice.
 */
export function useVoiceNote() {
  const [phase, setPhase] = useState<VoicePhase>('idle');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [durationMs, setDurationMs] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const startedAt = useRef(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const release = useCallback(() => {
    if (timer.current) { clearInterval(timer.current); timer.current = null; }
    rec.current?.stream.getTracks().forEach((t) => t.stop());
    setStream(null);
  }, []);

  const transcribe = useCallback(async (b: Blob, ms: number) => {
    setPhase('transcribing');
    try {
      const fd = new FormData();
      fd.append('audio', b, b.type.includes('mp4') ? 'note.m4a' : 'note.webm');
      fd.append('duration_ms', String(ms));
      const res = await fetch('/api/transcribe', { method: 'POST', body: fd });
      const t = (await res.json()) as { text?: string; failed?: boolean };
      const words = String(t.text ?? '').trim();
      if (!res.ok || t.failed || !words) setError('I could not make out the words. Type them below and your voice still goes with it.');
      else setTranscript(words);
    } catch {
      setError('Could not reach the transcriber. Type the words below and your voice still goes with it.');
    }
    setPhase('ready');
  }, []);

  const stop = useCallback(() => {
    if (rec.current?.state === 'recording') rec.current.stop();
    release();
  }, [release]);

  const start = useCallback(async () => {
    setError('');
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      const mr = new MediaRecorder(media, { audioBitsPerSecond: BITS });
      chunks.current = [];
      mr.ondataavailable = (e) => { if (e.data.size) chunks.current.push(e.data); };
      mr.onstop = () => {
        const ms = Date.now() - startedAt.current;
        if (ms < MIN_MS) { setError('That was too short to hear. Hold on a beat longer.'); setPhase('idle'); return; }
        const b = new Blob(chunks.current, { type: mr.mimeType || 'audio/webm' });
        setBlob(b); setDurationMs(ms);
        void transcribe(b, ms);
      };
      rec.current = mr;
      startedAt.current = Date.now();
      mr.start(1000);
      setStream(media);
      setElapsed(0);
      setPhase('recording');
      timer.current = setInterval(() => {
        const e = Date.now() - startedAt.current;
        setElapsed(e);
        if (e >= VOICE_MAX_MS) stop();
      }, 250);
    } catch {
      setError('No microphone available. You can type your note instead.');
      setPhase('idle');
    }
  }, [stop, transcribe]);

  const reset = useCallback(() => {
    stop(); setBlob(null); setDurationMs(0); setTranscript(''); setError(''); setElapsed(0); setPhase('idle');
  }, [stop]);

  useEffect(() => () => release(), [release]);

  return { phase, stream, elapsed, blob, durationMs, transcript, setTranscript, error, start, stop, reset };
}

/** m:ss */
export const clock = (ms: number) => {
  const total = Math.floor(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};
