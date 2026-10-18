'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { TodayResponse } from '@/contract';
import { startCheckin } from '@/lib/pendingCheckin';
import { Pet } from './Pet';

// No pitch-deck timer: people talk as long as they need. The only limits are
// practical. Ten minutes of 24 kbps audio is about 1.8 MB, well inside the 4.5 MB
// request limit, and about 1,500 words, which is what the 8,000-character entry
// cap in the database allows.
const MAX_MS = 10 * 60_000;
const WARN_MS = MAX_MS - 60_000;
const MIN_MS = 1_000;               // tap-to-start raises accidental-recording risk
const MAX_CHARS = 8_000;            // journal_entries.raw_text check
const AUDIO_BITS_PER_SECOND = 24_000; // plenty for speech, keeps long takes small

type Phase = 'capture' | 'transcribing' | 'preview';

export function CheckIn({ today }: { today: TodayResponse }) {
  const [phase, setPhase] = useState<Phase>('capture');
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const [transcriptFailed, setTranscriptFailed] = useState(false);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const [pet] = useState(today.pet);

  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const startedAt = useRef(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const audioUrl = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob]);
  useEffect(() => () => { if (audioUrl) URL.revokeObjectURL(audioUrl); }, [audioUrl]);

  const stop = useCallback(() => {
    if (timer.current) { clearInterval(timer.current); timer.current = null; }
    recorder.current?.state === 'recording' && recorder.current.stop();
    recorder.current?.stream.getTracks().forEach((t) => t.stop());
    setRecording(false);
  }, []);

  useEffect(() => () => stop(), [stop]);

  /** Words from audio. A failure keeps the recording and lets the person type. */
  async function transcribe(b: Blob, ms: number) {
    setPhase('transcribing');
    setError(null);
    try {
      const fd = new FormData();
      fd.append('audio', b, b.type.includes('mp4') ? 'entry.m4a' : 'entry.webm');
      fd.append('duration_ms', String(ms));
      const res = await fetch('/api/transcribe', { method: 'POST', body: fd });
      const t = await res.json();
      const words = String(t.text ?? '').trim();
      if (!res.ok || t.failed || !words) {
        setTranscriptFailed(true);
        setError("I couldn't make out the audio. Your recording is safe. Type what you said below.");
      } else {
        setTranscriptFailed(false);
        setText(words);
      }
    } catch {
      setTranscriptFailed(true);
      setError('Could not reach the transcriber. Your recording is safe. Type what you said below.');
    }
    setPhase('preview');
  }

  async function start() {
    setError(null);
    try {
      // Permission is requested on the FIRST TAP OF RECORD, never in onboarding.
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      const mr = new MediaRecorder(stream, { audioBitsPerSecond: AUDIO_BITS_PER_SECOND });
      chunks.current = [];
      mr.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      mr.onstop = () => {
        const ms = Date.now() - startedAt.current;
        if (ms < MIN_MS) {
          setError('That was too short to hear. Hold on a beat longer.');
          return;
        }
        const b = new Blob(chunks.current, { type: mr.mimeType || 'audio/webm' });
        setBlob(b);
        setDurationMs(ms);
        void transcribe(b, ms);
      };
      recorder.current = mr;
      startedAt.current = Date.now();
      mr.start(1000); // a chunk a second, so a long take is never held in one buffer
      setRecording(true);
      setElapsed(0);
      // We never auto-stop on silence: people pause mid-thought when they are
      // talking about someone they love. Only the safety limit stops a take.
      timer.current = setInterval(() => {
        const e = Date.now() - startedAt.current;
        setElapsed(e);
        if (e >= MAX_MS) stop();
      }, 250);
    } catch {
      setError('No microphone available. You can type instead.');
      setTyping(true);
    }
  }

  function discard() {
    setBlob(null); setDurationMs(null); setText(''); setError(null);
    setTranscriptFailed(false); setElapsed(0); setPhase('capture');
  }

  async function send() {
    const body = text.trim();
    if (!body) { setError('There is nothing to send yet. Say or type something first.'); return; }
    if (body.length > MAX_CHARS) { setError(`That is a long one. Trim it under ${MAX_CHARS.toLocaleString()} characters.`); return; }

    // Hand the words to the background and go Home: nobody should sit and wait on the AI.
    setError(null);
    startCheckin({
      text: body, input_mode: blob ? 'voice' : 'text', audio_duration_ms: durationMs,
      transcript_failed: transcriptFailed, local_date: localDate(),
    });
    router.push('/home');
  }

  const overLimit = text.trim().length > MAX_CHARS;
  const nearCap = recording && elapsed >= WARN_MS;

  return (
    <div>
      <p className="display h1" style={{ marginBottom: 6 }}>
        {greeting()}, {today.display_name}.
      </p>
      <p className="body" style={{ color: 'var(--ink-muted)', marginTop: 0 }}>
        How did today actually go? Say it out loud or type it. Take as long as you like.
      </p>

      <div className="card" style={{ textAlign: 'center', marginTop: 20 }}>
        {phase === 'capture' && (
          <>
            <button
              className="mic" data-recording={recording}
              onClick={recording ? stop : start}
              aria-label={recording ? 'Stop recording' : 'Start recording'}
            >
              {recording
                ? <span style={{ width: 26, height: 26, background: '#fff', borderRadius: 4, display: 'block' }} />
                : <MicGlyph />}
            </button>
            <p className="caption" style={{ marginTop: 14, fontVariantNumeric: 'tabular-nums' }} aria-live="polite">
              {recording ? `Recording ${formatClock(elapsed)}` : 'Tap to start, tap to stop'}
            </p>
            {nearCap && (
              <p className="caption" style={{ marginTop: 4, color: '#9E4A33' }}>
                One minute left. Recording stops at {MAX_MS / 60_000} minutes.
              </p>
            )}
          </>
        )}

        {phase === 'transcribing' && (
          <p className="body" style={{ margin: 0 }} aria-live="polite">Turning your voice into words…</p>
        )}

        {phase === 'preview' && audioUrl && (
          <audio controls src={audioUrl} style={{ width: '100%' }} />
        )}

        {(typing || phase === 'preview') && phase !== 'transcribing' && (
          <>
            <textarea
              className="entry" value={text} onChange={(e) => setText(e.target.value)}
              aria-label={blob ? 'What you said. Edit it if anything is off.' : 'Your entry'}
              placeholder={blob ? 'Your words will show up here.' : 'Type it here.'}
              style={{ marginTop: 14 }}
            />
            <p className="caption" style={{ textAlign: 'right', margin: '4px 2px 0', color: overLimit ? '#9E4A33' : undefined }}>
              {blob && !transcriptFailed && text ? 'Edit anything that sounds off. ' : ''}
              {text.length.toLocaleString()} / {MAX_CHARS.toLocaleString()}
            </p>
          </>
        )}

        {phase === 'preview' && (
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button className="btn btn-quiet" onClick={discard}>Re-record</button>
            <button className="btn" onClick={send} disabled={!text.trim() || overLimit}>Send</button>
          </div>
        )}

        {typing && phase === 'capture' && text.trim().length > 0 && (
          <button className="btn" style={{ marginTop: 12 }} onClick={send} disabled={overLimit}>Send</button>
        )}
      </div>

      {/* Non-negotiable: you cannot speak a reflection about your partner while
          sitting next to them, or on a bus. */}
      {!typing && phase === 'capture' && !recording && (
        <p style={{ textAlign: 'center', marginTop: 6 }}>
          <button className="link" onClick={() => setTyping(true)}>⌨ Type instead</button>
        </p>
      )}

      {error && <p className="small" style={{ color: '#9E4A33', textAlign: 'center' }} role="alert">{error}</p>}

      <div className="card card-warm" style={{ marginTop: 22 }}>
        <Pet pet={pet} />
      </div>
    </div>
  );
}

const MicGlyph = () => (
  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0" /><path d="M12 18v4" />
  </svg>
);

/** m:ss for the running clock. */
function formatClock(ms: number) {
  const total = Math.floor(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Morning' : h < 18 ? 'Afternoon' : 'Evening';
}

/** The device's local day. Never a UTC slice — that rolls over at 5pm Pacific. */
function localDate() {
  return new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}
