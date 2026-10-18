'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRef, useState, type ReactNode } from 'react';
import { AnimatedPet, type PetAnimation } from './AnimatedPet';
import { PetSelection } from './PetSelection';
import { type AvailablePet } from './catalog';
import { eatingFrames, eatingDuration, type PlaybackSnapshot } from './eatingV3';

function PreviewFrame({ title, children }: { title: string; children: ReactNode }) {
  return <main className="mx-auto flex min-h-dvh max-w-[430px] flex-col gap-6 px-5 py-9">
    <header className="space-y-2">
      <p className="text-xs tracking-widest text-[var(--ink-muted)] uppercase">Yini · Pet preview</p>
      <h1 className="font-[family-name:var(--font-display)] text-[28px] leading-tight font-semibold tracking-tight">{title}</h1>
    </header>
    {children}
    <nav aria-label="Pet previews" className="flex flex-wrap gap-5 text-sm text-[var(--primary-press)]">
      <Link className="py-3 underline underline-offset-4" href="/dev/pet-selection">Pet selection</Link>
      <Link className="py-3 underline underline-offset-4" href="/dev/pet-animation">Pet animations</Link>
    </nav>
  </main>;
}

export function PetSelectionPreview() {
  const [selected, setSelected] = useState<AvailablePet>();
  return <PreviewFrame title="A little friend for you two.">
    <p className="text-[var(--ink-muted)]">Choose a companion to share your everyday moments.</p>
    <PetSelection selectedId={selected?.id} onSelect={setSelected} />
    {selected && <section className="rounded-[20px] border border-[var(--line)] bg-white p-6 text-center">
      <AnimatedPet pet={selected} animation="happy" />
      <p role="status" className="font-semibold">{selected.name} is your companion.</p>
      <p className="mt-2 text-sm text-[var(--ink-muted)]">A small beginning, together.</p>
    </section>}
  </PreviewFrame>;
}

export function PetAnimationPreview() {
  const [request, setRequest] = useState<{ animation: PetAnimation; id: number }>({ animation: 'idle', id: 0 });
  const [status, setStatus] = useState('Idle — breathing, floating, and occasional blinks.');
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const [speed, setSpeed] = useState(1);
  const [playback, setPlayback] = useState<PlaybackSnapshot>({ frame: -1, stage: 'complete' });
  function play(animation: PetAnimation) {
    if (locked.current) return;
    locked.current = animation !== 'idle';
    setBusy(locked.current);
    setPlayback({ frame: -1, stage: 'loading' });
    setRequest((previous) => ({ animation, id: previous.id + 1 }));
    setStatus(animation === 'idle' ? 'Idle — breathing, floating, and occasional blinks.'
      : animation === 'feeding' ? 'Anticipation → eating → satisfied → idle.' : `${animation === 'happy' ? 'Happy' : 'Blink'} → idle.`);
  }
  return <PreviewFrame title="Say hello to Cat.">
    <p className="text-[var(--ink-muted)]">A little love goes a long way.</p>
    <section className="overflow-hidden rounded-[20px] border border-[var(--line)] bg-white">
      <div className="bg-[var(--surface-warm)] px-8 pt-10 pb-5">
        <AnimatedPet animation={request.animation} requestId={request.id} playbackSpeed={speed} onPlaybackChange={setPlayback}
          onComplete={() => { locked.current = false; setBusy(false); setStatus('Idle — breathing, floating, and occasional blinks.'); }} />
      </div>
      <div className="space-y-3 p-6 text-center">
        <h2 className="font-[family-name:var(--font-display)] text-[22px] font-semibold">Your everyday companion</h2>
        <p role="status" className="min-h-10 text-sm text-[var(--ink-muted)]">{status}</p>
        <button type="button" disabled={busy} onClick={() => play('feeding')}
          className="min-h-13 w-full cursor-pointer rounded-full bg-[var(--primary)] px-5 font-semibold text-white shadow-[0_4px_0_var(--primary-press)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)]">Feed a little love ♥</button>
      </div>
    </section>
    <section className="space-y-3" aria-label="Playback controls">
      <p>Animation: {busy ? request.animation === 'feeding' ? playback.stage : request.animation : 'idle'} · Frame: {playback.frame < 0 ? '—' : playback.frame} · {(eatingDuration / speed / 1000).toFixed(2)} seconds</p>
      <label>Playback speed <select value={speed} disabled={busy} onChange={event => setSpeed(Number(event.target.value))}>
        {[0.5, 0.75, 1, 1.25].map(rate => <option key={rate} value={rate}>{rate}×</option>)}
      </select></label>
      <button type="button" disabled={busy} onClick={() => play('feeding')} className="ml-4 rounded-full border px-5 py-3">Replay</button>
    </section>
    <details>
      <summary className="cursor-pointer py-3">Inspect all 16 extracted frames</summary>
      <div className="grid grid-cols-2 gap-3">
        {eatingFrames.map((src, index) => <figure key={src} className="rounded border bg-[var(--surface-warm)] p-2">
          <Image src={src} alt={`Cat eating source frame ${index}`} width={578} height={518} unoptimized className="h-auto w-full" />
          <figcaption>Frame {index}{index > 12 ? ' · optional, not played' : ''}</figcaption>
        </figure>)}
      </div>
    </details>
    <div className="flex flex-wrap gap-2" role="group" aria-label="Preview animation">
      {(['idle', 'blink', 'happy'] as const).map((animation) => <button key={animation} type="button" disabled={busy} onClick={() => play(animation)}
        className="min-h-11 flex-1 cursor-pointer rounded-full border border-[var(--line-strong)] px-4 text-sm text-[var(--ink-muted)] capitalize focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)]">{animation}</button>)}
    </div>
    <p className="text-sm text-[var(--ink-muted)]">Your device’s reduced-motion preference is respected. Expressions still change, with no floating or bouncing.</p>
  </PreviewFrame>;
}
