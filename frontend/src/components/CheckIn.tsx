'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CheckinResponse, TodayResponse } from '@/contract';
import { Pet } from './Pet';

const CAP_MS = 10_000;  // the 10-second constraint is a pitch advantage; say the number
const MIN_MS = 1_000;   // tap-to-start raises accidental-recording risk

type Phase = 'capture' | 'preview' | 'sending' | 'reply';

export function CheckIn({ today }: { today: TodayResponse }) {
  const [phase, setPhase] = useState<Phase>('capture');
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState<CheckinResponse | null>(null);
  const [pet, setPet] = useState(today.pet);

  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const startedAt = useRef(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(() => {
    if (timer.current) { clearInterval(timer.current); timer.current = null; }
    recorder.current?.state === 'recording' && recorder.current.stop();
    recorder.current?.stream.getTracks().forEach((t) => t.stop());
    setRecording(false);
  }, []);

  useEffect(() => () => stop(), [stop]);

  async function start() {
    setError(null);
    try {
      // Permission is requested on the FIRST TAP OF RECORD, never in onboarding.
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      const mr = new MediaRecorder(stream);
      chunks.current = [];
      mr.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      mr.onstop = () => {
        const b = new Blob(chunks.current, { type: mr.mimeType || 'audio/webm' });
        if (Date.now() - startedAt.current < MIN_MS) {
          setError('That was too short to hear — hold on a beat longer.');
          return;
        }
        setBlob(b);
        setPhase('preview');
      };
      recorder.current = mr;
      startedAt.current = Date.now();
      mr.start();
      setRecording(true);
      setElapsed(0);
      // Hard cap only. We never auto-stop on silence: people pause mid-thought
      // when they are talking about someone they love.
      timer.current = setInterval(() => {
        const e = Date.now() - startedAt.current;
        setElapsed(e);
        if (e >= CAP_MS) stop();
      }, 50);
    } catch {
      setError('No microphone available. You can type instead.');
      setTyping(true);
    }
  }

  async function send() {
    setPhase('sending');
    setError(null);
    let body = text.trim();
    let transcriptFailed = false;
    let durationMs: number | null = null;

    try {
      if (blob && !body) {
        const fd = new FormData();
        fd.append('audio', blob, 'entry.webm');
        fd.append('duration_ms', String(elapsed));
        const tr = await fetch('/api/transcribe', { method: 'POST', body: fd });
        const t = await tr.json();
        body = (t.text ?? '').trim();
        durationMs = t.duration_ms ?? elapsed;
        transcriptFailed = Boolean(t.failed) || !body;
      }
      if (!body) {
        // The recording is the artifact; a failed transcript must never lose it.
        setError("I couldn't make out the audio. Your recording is safe — type what you said and send.");
        setTyping(true);
        setPhase('preview');
        return;
      }

      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          text: body,
          input_mode: blob && !text.trim() ? 'voice' : 'text',
          audio_duration_ms: durationMs,
          transcript_failed: transcriptFailed,
          connection_id: null,
          audio_path: null,
          local_date: localDate(),
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? 'Something went wrong.'); setPhase('preview'); return; }
      setReply(json as CheckinResponse);
      setPet((json as CheckinResponse).pet);
      setPhase('reply');
    } catch {
      setError('Network hiccup. Your words are still here — try send again.');
      setPhase('preview');
    }
  }

  if (phase === 'reply' && reply) return <Reply reply={reply} pet={pet} partner={today.partner_display_name} />;

  const remaining = Math.max(0, CAP_MS - elapsed);
  const pct = Math.min(100, (elapsed / CAP_MS) * 100);

  return (
    <div>
      <p className="display h1" style={{ marginBottom: 6 }}>
        {greeting()}, {today.display_name}.
      </p>
      <p className="body" style={{ color: 'var(--ink-muted)', marginTop: 0 }}>
        Ten seconds. How did today actually go?
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
            <p className="caption" style={{ marginTop: 14, fontVariantNumeric: 'tabular-nums' }}>
              {recording ? `${(remaining / 1000).toFixed(1)}s left` : 'Tap to start, tap to stop'}
            </p>
            {recording && (
              <div className="bond-track" style={{ marginTop: 10 }}>
                <div className="bond-fill" style={{ width: `${100 - pct}%`, background: '#D63A3A' }} />
              </div>
            )}
          </>
        )}

        {phase === 'preview' && (
          <>
            {blob && <audio controls src={URL.createObjectURL(blob)} style={{ width: '100%' }} />}
            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <button className="btn btn-quiet" onClick={() => { setBlob(null); setText(''); setPhase('capture'); }}>
                Re-record
              </button>
              <button className="btn" onClick={send}>Send</button>
            </div>
          </>
        )}

        {phase === 'sending' && <p className="body" style={{ margin: 0 }}>Thinking about your day…</p>}

        {(typing || phase === 'preview') && (
          <textarea
            className="entry" value={text} onChange={(e) => setText(e.target.value)}
            placeholder="Or type it here." style={{ marginTop: 14 }}
          />
        )}

        {typing && phase === 'capture' && text.trim().length > 0 && (
          <button className="btn" style={{ marginTop: 12 }} onClick={send}>Send</button>
        )}
      </div>

      {/* Non-negotiable: you cannot speak a reflection about your partner while
          sitting next to them, or on a bus. */}
      {!typing && phase === 'capture' && (
        <p style={{ textAlign: 'center', marginTop: 6 }}>
          <button className="link" onClick={() => setTyping(true)}>⌨ Type instead</button>
        </p>
      )}

      {error && <p className="small" style={{ color: '#9E4A33', textAlign: 'center' }}>{error}</p>}

      <div className="card card-warm" style={{ marginTop: 22 }}>
        <Pet pet={pet} />
      </div>
    </div>
  );
}

function Reply({ reply, pet, partner }: { reply: CheckinResponse; pet: CheckinResponse['pet']; partner: string }) {
  return (
    <div>
      {reply.safety && (
        <div className="card" style={{ borderColor: '#D6C9B0', background: 'var(--surface-warm)' }}>
          <p className="body" style={{ marginTop: 0 }}>{reply.reply.for_you}</p>
          {reply.safety.resources.map((r) => (
            <p key={r.label} className="small" style={{ margin: '8px 0' }}>
              <strong style={{ color: 'var(--ink)' }}>{r.label}</strong><br />{r.detail}
            </p>
          ))}
        </div>
      )}

      {!reply.safety && (
        <>
          <div className="card">
            <p className="body" style={{ marginTop: 0 }}>{reply.reply.acknowledgement}</p>
            <p className="body" style={{ marginBottom: 0, color: 'var(--ink-muted)' }}>{reply.reply.for_you}</p>
          </div>

          {/* Only ever names acts the partner actually logged. Absent, not apologised for. */}
          {reply.reply.reveal && (
            <div className="card card-warm">
              <p className="caption" style={{ marginTop: 0, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                While you were under
              </p>
              <p className="body" style={{ marginBottom: 0 }}>{reply.reply.reveal}</p>
            </div>
          )}

          {reply.reply.partner_item && (
            <div className="card">
              <p className="caption" style={{ marginTop: 0, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                One thing, if you have it in you
              </p>
              <p className="body" style={{ marginBottom: 0 }}>{reply.reply.partner_item}</p>
            </div>
          )}
        </>
      )}

      <div className="card card-warm" style={{ marginTop: 14 }}>
        <Pet pet={pet} hatching={reply.pet_hatched_now} />
        {reply.pet_hatched_now && (
          <p className="body" style={{ textAlign: 'center', marginBottom: 0 }}>
            You both showed up. {pet.name} hatched.
          </p>
        )}
      </div>

      <p className="caption" style={{ textAlign: 'center', marginTop: 18 }}>
        {partner} will never see what you wrote.
      </p>
    </div>
  );
}

const MicGlyph = () => (
  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0" /><path d="M12 18v4" />
  </svg>
);

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Morning' : h < 18 ? 'Afternoon' : 'Evening';
}

/** The device's local day. Never a UTC slice — that rolls over at 5pm Pacific. */
function localDate() {
  return new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}
