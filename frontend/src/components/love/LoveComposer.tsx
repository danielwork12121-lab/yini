'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { LoveSendResponse } from '@/contract';
import { BackArrow, HeartSmall, MicRecord, PencilIcon, PlayIcon, PauseIcon } from '@/components/app/icons';
import { LiveBars } from '@/components/app/LiveBars';
import { clock, useVoiceNote } from './useVoiceNote';

const Heart = () => (
  <svg width="44" height="40" viewBox="0 0 44 40" aria-hidden="true"><path d="M22 37 C9 28 3 21 3 13 A9 9 0 0 1 22 9 A9 9 0 0 1 41 13 C41 21 35 28 22 37 Z" fill="#F6B3A3" /></svg>
);

/**
 * Write a love note: say it out loud or write it down. Nothing is sent until you confirm,
 * and your person gets exactly what you confirmed: your words, and your voice if you spoke.
 */
export function LoveComposer({ partner, onClose, onSent }: { partner: string; onClose: () => void; onSent: (r: LoveSendResponse) => void }) {
  const voice = useVoiceNote();
  const [typing, setTyping] = useState(false);
  const [text, setText] = useState('');
  const [step, setStep] = useState<'compose' | 'confirm' | 'sent'>('compose');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [playing, setPlaying] = useState(false);
  const audioEl = useRef<HTMLAudioElement | null>(null);

  const url = useMemo(() => (voice.blob ? URL.createObjectURL(voice.blob) : null), [voice.blob]);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  const voiceMode = !typing;
  const rec = voice.phase === 'recording';
  const busy = voice.phase === 'transcribing';
  const ready = voice.phase === 'ready' && !!voice.blob;
  const words = voiceMode ? voice.transcript.trim() : text.trim();
  const canSend = voiceMode ? ready : text.trim().length > 0;

  function toggleRecord() {
    if (!voiceMode) { setTyping(false); void voice.start(); return; }
    if (rec) voice.stop(); else if (voice.phase === 'idle' || ready) { if (ready) voice.reset(); void voice.start(); }
  }

  function togglePlay() {
    const a = audioEl.current;
    if (!a) return;
    if (a.paused) void a.play(); else a.pause();
  }

  async function send() {
    setSending(true); setError('');
    try {
      const fd = new FormData();
      fd.append('body', words);
      if (voiceMode && voice.blob) {
        fd.append('audio', voice.blob, voice.blob.type.includes('mp4') ? 'note.m4a' : 'note.webm');
        fd.append('duration_ms', String(voice.durationMs));
      }
      const res = await fetch('/api/love', { method: 'POST', body: fd });
      const body = (await res.json().catch(() => null)) as (LoveSendResponse & { error?: string }) | null;
      if (!res.ok || !body?.note) throw new Error(typeof body?.error === 'string' ? body.error : '');
      onSent(body);
      setStep('sent');
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : 'That did not send. Nothing was lost. Try again in a moment.');
      setStep('compose');
    }
    setSending(false);
  }

  function another() {
    voice.reset(); setText(''); setTyping(false); setError(''); setStep('compose');
  }

  if (step === 'sent') {
    return (
      <div className="love-full love-sent" role="status">
        <div className="love-halo"><HeartSmall /></div>
        <h2>Sent with love ♡</h2>
        <p>Your note is on its way to {partner}.</p>
        <button type="button" className="cta-big love-back" onClick={onClose}>Back to Glow</button>
        <button type="button" className="cta-quiet" onClick={another}>Write another</button>
      </div>
    );
  }

  const status = rec ? 'Listening…' : busy ? 'Writing it down…' : ready ? 'Voice note' : 'Tap the mic to start';
  const hint = rec ? 'Your words will show up here as you talk…' : busy ? 'Turning your voice into words…' : ready ? '' : 'Say what you love, thank them for something, or just tell them how you feel.';

  return (
    <div className="love-full" role="dialog" aria-modal="true" aria-labelledby="love-h">
      <button type="button" className="love-back-arrow" onClick={onClose} aria-label="Back to Glow"><BackArrow /></button>
      <h1 id="love-h">A little something for you ♡</h1>
      <p className="love-sub">What’s something you appreciate about {partner}?<br />Say it out loud or write it down.</p>

      <div className="love-box">
        {voiceMode ? (
          <>
            <div className="love-status">
              {rec && <span className="listen-dot" style={{ animation: 'pulse2 1.4s infinite' }} aria-hidden="true" />}
              <span>{status}</span>
              {rec && <span style={{ marginLeft: 'auto' }}><LiveBars stream={voice.stream} /></span>}
              {ready && <button type="button" className="linkbtn" style={{ marginLeft: 'auto' }} onClick={() => voice.reset()}>Re-record</button>}
            </div>
            {ready && url && (
              <div className="love-clip">
                <button type="button" className="love-play" onClick={togglePlay} aria-label={playing ? 'Pause your voice note' : 'Play your voice note'}>{playing ? <PauseIcon /> : <PlayIcon />}</button>
                <span className="love-wave" aria-hidden="true" />
                <span className="love-dur">{clock(voice.durationMs)}</span>
                <audio ref={audioEl} src={url} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} />
              </div>
            )}
            {ready ? (
              <textarea className="love-area" value={voice.transcript} onChange={(e) => voice.setTranscript(e.target.value)} aria-label="The words of your voice note. Edit them if anything is off." placeholder="Type the words here" maxLength={4000} />
            ) : (
              <p className="love-hint">{hint}</p>
            )}
            <div className="love-foot">
              <span>{rec ? `Recording ${clock(voice.elapsed)} · tap to finish` : ready ? 'They’ll hear your voice and see the words.' : 'Tap the box to type instead'}</span>
              <Heart />
            </div>
            {!rec && !ready && !busy && <button type="button" className="love-tap" aria-label="Type your note instead" onClick={() => setTyping(true)} />}
          </>
        ) : (
          <>
            <div className="love-status"><PencilIcon /><span>Write it down</span></div>
            <textarea className="love-area" autoFocus value={text} onChange={(e) => setText(e.target.value)} aria-label="Your love note" placeholder="I really loved it when you…" maxLength={4000} />
            <div className="love-foot"><span>Take your time</span><Heart /></div>
          </>
        )}
      </div>

      <div className="love-rec">
        <div className="love-recring">
          <button type="button" className="love-recbtn" onClick={toggleRecord} disabled={busy} aria-label={rec ? 'Stop recording' : 'Start recording'} aria-pressed={rec}>
            {rec ? <span className="love-stop" /> : <MicRecord />}
          </button>
        </div>
        <p>{!voiceMode ? 'Tap the mic to talk instead' : rec ? 'Tap to stop' : ready ? 'Tap to record again' : 'Tap to record'}</p>
      </div>

      {(error || voice.error) && <p className="err" role="alert" style={{ textAlign: 'center' }}>{error || voice.error}</p>}

      <button type="button" className="cta-big love-send" disabled={!canSend || busy || rec} onClick={() => setStep('confirm')}>Send with love →</button>
      <p className="love-fine">Nothing is sent until you confirm.</p>

      {step === 'confirm' && (
        <>
          <div className="sheet-scrim" onClick={() => setStep('compose')} />
          <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="love-confirm">
            <div className="sheet-grab" />
            <h2 id="love-confirm">Send this to {partner}?</h2>
            <p className="sheet-sub">They’ll get exactly this, plus a little notification.</p>
            <div className="love-preview">
              {voiceMode && voice.blob && <p className="love-preview-voice">Voice note · {clock(voice.durationMs)}</p>}
              {words ? words : <span style={{ color: 'var(--muted)' }}>(no words, just your voice)</span>}
            </div>
            <button type="button" className="cta-big" disabled={sending} onClick={() => void send()}>{sending ? 'Sending…' : 'Yes, send it ♡'}</button>
            <button type="button" className="cta-quiet" onClick={() => setStep('compose')}>Keep editing</button>
          </div>
        </>
      )}
    </div>
  );
}
