'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { TodayResponse } from '@/contract';
import { startCheckin } from '@/lib/pendingCheckin';
import { fetchAppToday } from '@/lib/appClock';
import { Room } from '@/components/app/Room';
import { KeyboardIcon, MicSmall, WaveIcon } from '@/components/app/icons';

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
    // The day comes from the app's clock, so a fast-forwarded demo files this under the new day.
    const local_date = await fetchAppToday();
    startCheckin({
      text: body, input_mode: blob ? 'voice' : 'text', audio_duration_ms: durationMs,
      transcript_failed: transcriptFailed, local_date,
    });
    router.push('/home');
  }

  const overLimit = text.trim().length > MAX_CHARS;
  const nearCap = recording && elapsed >= WARN_MS;

  const showText = (typing || phase === 'preview') && phase !== 'transcribing';
  const tag = recording ? 'Listening…' : phase === 'transcribing' ? 'Writing it down…' : phase === 'preview' ? 'Here is what I heard' : typing ? 'Type it here' : `${greeting()}, ${today.display_name}`;

  return (
    <main>
      <h1 className="sr-only">Tell Yini about your day</h1>
      <section className={`listen listen-wide${recording ? ' listen-live' : ''}`} aria-label="Check in">
        <div className="listen-top">
          <span className="listen-tag"><span className="listen-dot" aria-hidden="true" />{tag}</span>
          {recording && <span className="listen-wave"><WaveIcon /></span>}
        </div>

        {phase === 'capture' && !typing && (
          <p className="listen-text">
            {recording ? 'Take as long as you like. Your words will show up here when you let go.' : 'How did today actually go? Say it out loud, and take as long as you like.'}
          </p>
        )}

        {phase === 'capture' && !typing && (
          <>
            <button
              className="listen-micbtn" data-recording={recording}
              onClick={recording ? stop : start}
              aria-label={recording ? 'Stop recording' : 'Start recording'}
            >
              {recording ? <span className="listen-stop" /> : <MicSmall />}
            </button>
            <p className="listen-hint" aria-live="polite">
              {recording ? `Recording ${formatClock(elapsed)} · tap to finish` : 'Tap to start, tap to stop'}
            </p>
            {nearCap && (
              <p className="listen-hint" style={{ color: '#9E4A33' }}>
                One minute left. Recording stops at {MAX_MS / 60_000} minutes.
              </p>
            )}
          </>
        )}

        {phase === 'transcribing' && (
          <p className="listen-text" aria-live="polite">Turning your voice into words…</p>
        )}

        {phase === 'preview' && audioUrl && (
          <audio controls src={audioUrl} />
        )}

        {showText && (
          <>
            <textarea
              className="listen-area" value={text} onChange={(e) => setText(e.target.value)}
              aria-label={blob ? 'What you said. Edit it if anything is off.' : 'Your entry'}
              placeholder={blob ? 'Your words will show up here.' : 'Type it here.'}
            />
            <div className="listen-foot" style={overLimit ? { color: '#9E4A33' } : undefined}>
              <span>{blob && !transcriptFailed && text ? 'Edit anything that sounds off.' : ''}</span>
              <span>{text.length.toLocaleString()} / {MAX_CHARS.toLocaleString()}</span>
            </div>
          </>
        )}

        {phase === 'preview' && (
          <div className="listen-actions">
            <button className="cta cta-white" onClick={discard}>Re-record</button>
            <button className="cta" onClick={send} disabled={!text.trim() || overLimit}>Send</button>
          </div>
        )}

        {typing && phase === 'capture' && text.trim().length > 0 && (
          <button className="cta" onClick={send} disabled={overLimit} style={{ height: 'max(48px, calc(90 * var(--u)))' }}>Send</button>
        )}
      </section>

      {/* Non-negotiable: you cannot speak a reflection about your partner while
          sitting next to them, or on a bus. */}
      {!typing && phase === 'capture' && !recording && (
        <div className="typeinstead">
          <button type="button" onClick={() => setTyping(true)}><KeyboardIcon />Type instead</button>
        </div>
      )}

      {error && <p className="err" role="alert">{error}</p>}

      <Room />
      <p className="reply-foot" style={{ margin: 'calc(24 * var(--u)) calc(60 * var(--u)) 0' }}>
        {pet.hatched ? pet.name : 'An egg, for now'} · {pet.bond_name} · {pet.total_half_days} {pet.total_half_days === 1 ? 'half-day' : 'half-days'}
        {' · '}{pet.both_fed_today ? 'Fully fed today.' : pet.you_fed_today ? 'Half fed today.' : 'Napping.'}
      </p>
    </main>
  );
}

/** m:ss for the running clock. */
function formatClock(ms: number) {
  const total = Math.floor(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Morning' : h < 18 ? 'Afternoon' : 'Evening';
}

