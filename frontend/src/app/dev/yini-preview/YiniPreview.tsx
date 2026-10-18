'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { AnimatedPet, type PetAnimation } from '@/components/pets/AnimatedPet';
import { PetSelection } from '@/components/pets/PetSelection';
import { type AvailablePet } from '@/components/pets/catalog';
import { Welcome } from './Welcome';
import { PetRoom } from './PetRoom';

type Screen = 'welcome' | 'selection' | 'today' | 'log' | 'problems' | 'compliments';
const heading = 'font-[family-name:var(--font-display)] text-[28px] leading-[1.2] font-semibold tracking-[-0.5px] [font-variation-settings:"SOFT"_50,"WONK"_1]';
const smallHeading = 'font-[family-name:var(--font-display)] text-[22px] leading-[1.25] font-semibold tracking-[-0.3px]';
const primary = 'min-h-[52px] w-full cursor-pointer rounded-full bg-[var(--primary)] px-5 text-base font-semibold text-white shadow-[0_4px_0_var(--primary-press)] disabled:cursor-not-allowed disabled:opacity-50';
const quiet = 'min-h-12 cursor-pointer rounded-full border border-[var(--line-strong)] px-5 text-sm text-[var(--ink-muted)]';
const caption = 'text-[13px] leading-[1.4] text-[var(--ink-faint)]';

function Card({ children, warm = false }: { children: ReactNode; warm?: boolean }) {
  return <section className={`rounded-[20px] border border-[var(--line)] p-6 ${warm ? 'bg-[var(--surface-warm)]' : 'bg-white'}`}>{children}</section>;
}
function Icon({ kind }: { kind: 'today' | 'problems' | 'compliments' | 'back' | 'next' }) {
  return <svg className="h-6 w-6 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {kind === 'today' ? <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>
      : kind === 'problems' ? <path d="M5 6h14M5 12h14M5 18h9" />
      : kind === 'compliments' ? <path d="M12 20s-7-4.4-8.5-9C2.6 8 4.4 5 7.4 5c1.9 0 3.4 1 4.6 2.6C13.2 6 14.7 5 16.6 5c3 0 4.8 3 3.9 6-1.5 4.6-8.5 9-8.5 9z" />
      : <path d={kind === 'back' ? 'm15 6-6 6 6 6' : 'm9 6 6 6-6 6'} />}
  </svg>;
}

export function YiniPreview() {
  const [screen, setScreen] = useState<Screen>('welcome');
  const [selected, setSelected] = useState<AvailablePet>();
  const [request, setRequest] = useState<{ animation: PetAnimation; id: number }>({ animation: 'idle', id: 0 });
  const [fed, setFed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('Tap Cat to say hello.');
  const [entry, setEntry] = useState('');
  const [logged, setLogged] = useState(false);
  const [kindWords, setKindWords] = useState('');
  const [banked, setBanked] = useState(false);
  const reduced = useReducedMotion();
  const focusTarget = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    focusTarget.current?.focus();
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [screen]);

  function navigate(next: Screen) {
    // Leaving the room cancels its animation; returning starts a fresh idle loop.
    setBusy(false);
    setRequest((previous) => ({ animation: 'idle', id: previous.id + 1 }));
    setStatus('Tap Cat to say hello.');
    setScreen(next);
  }
  function play(animation: 'happy' | 'feeding') {
    setBusy(true);
    setRequest((previous) => ({ animation, id: previous.id + 1 }));
    setStatus(animation === 'feeding' ? 'A little love for Cat…' : 'Cat is happy to see you.');
  }
  function reset() {
    setSelected(undefined); setFed(false); setEntry(''); setLogged(false);
    setKindWords(''); setBanked(false); navigate('welcome');
  }
  const showTabs = screen === 'today' || screen === 'problems' || screen === 'compliments';

  return <div className={`min-h-dvh [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-offset-4 [&_button:focus-visible]:outline-[var(--primary)] ${screen === 'welcome' ? 'bg-[#FDF6EE]' : 'bg-[var(--canvas)]'}`}>
    <div className="mx-auto flex max-w-[430px] items-center justify-between px-5 py-2 text-xs text-[var(--ink-muted)]">
      <span>Local demo · nothing is saved</span>
      <button type="button" onClick={reset} className="min-h-11 cursor-pointer px-2 underline underline-offset-4">Start over</button>
    </div>
    <main ref={focusTarget} tabIndex={-1} aria-label={screen === 'selection' ? 'Choose your pet' : screen === 'today' ? 'Today with Cat' : screen} className="outline-none">
      {screen === 'welcome' ? <Welcome onStart={() => navigate('selection')} /> : <motion.div key={screen}
        initial={{ opacity: reduced === false ? 0 : 1 }} animate={{ opacity: 1 }} transition={{ duration: reduced === false ? 0.22 : 0 }}
        className={`mx-auto flex max-w-[430px] flex-col gap-4 px-5 pt-5 ${showTabs ? 'pb-32' : 'pb-10'}`}>
        {screen === 'selection' && <>
          <button type="button" className="flex min-h-11 w-fit cursor-pointer items-center text-[var(--ink-muted)]" onClick={() => navigate('welcome')}><Icon kind="back" />Welcome</button>
          <header><h1 className={heading}>A little friend for you two.</h1><p className="mt-1.5 leading-[1.6] text-[var(--ink-muted)]">Choose who will grow with you, one little moment at a time.</p></header>
          <PetSelection selectedId={selected?.id} onSelect={setSelected} />
          <p role="status" className="text-center text-sm text-[var(--ink-muted)]">{selected ? 'Cat is ready to meet you.' : 'Your companion starts here.'}</p>
          <button type="button" disabled={!selected} className={primary} onClick={() => navigate('today')}>Meet {selected?.name ?? 'your companion'} <span aria-hidden="true">→</span></button>
        </>}
        {screen === 'today' && <>
          <header><h1 className={heading}>Hello, Avery.</h1><p className="mt-1 leading-[1.6] text-[var(--ink-muted)]">You and Sam</p></header>
          <section className="overflow-hidden rounded-[20px] border border-[var(--line)] bg-white" aria-label="Your companion Cat">
            <div className="relative h-[210px]">
              <PetRoom />
              <button type="button" aria-label="Pet Cat" disabled={busy} onClick={() => play('happy')} className="absolute bottom-5 left-1/2 w-[156px] -translate-x-1/2 cursor-pointer rounded-full disabled:cursor-default">
                <AnimatedPet pet={selected} animation={request.animation} requestId={request.id} className="w-full"
                  onComplete={() => { setBusy(false); if (request.animation === 'feeding') setFed(true); setStatus(request.animation === 'feeding' ? 'Cat loved that. A little closer, together.' : 'Tap Cat to say hello.'); }} />
              </button>
            </div>
            <div className="px-6 pt-[18px] pb-6 text-center">
              <h2 className={smallHeading}>Cat</h2>
              <p className={`${caption} mt-0.5`}>Just Met · {fed ? '1 half-day' : '0 half-days'}</p>
              <div role="progressbar" aria-label="Progress to Warming Up" aria-valuemin={0} aria-valuemax={2} aria-valuenow={fed ? 1 : 0} className="mt-3.5 h-2 overflow-hidden rounded-full bg-[var(--canvas-sunk)]">
                <motion.div className="h-full rounded-full bg-[var(--sage)]" initial={false} animate={{ width: fed ? '50%' : '0%' }} transition={{ duration: reduced === false ? 0.4 : 0 }} />
              </div>
              <p className={`${caption} mt-2`}>Next: Warming Up</p>
              <p className={`${caption} mt-2.5`}>{fed ? 'Half fed today.' : 'Napping.'}</p>
              <p role="status" className="mt-3 min-h-5 text-sm text-[var(--ink-muted)]">{status}</p>
              <button type="button" disabled={busy} className={`${primary} mt-4`} onClick={() => play('feeding')}>{busy ? 'Sharing a little love…' : fed ? 'Feed Cat again ♥' : 'Feed Cat a little love ♥'}</button>
              <button type="button" className="mt-3 min-h-11 cursor-pointer px-3 text-sm text-[var(--ink-muted)] underline underline-offset-4" onClick={() => navigate('selection')}>Choose a companion</button>
            </div>
          </section>
          <Card><p className="leading-[1.6]">{logged ? 'Logged for today.' : 'Ten seconds. How did today actually go?'}</p><p className="mt-1 mb-4 text-sm leading-[1.5] text-[var(--ink-muted)]">{logged ? 'A small moment, kept just for you.' : 'Take a moment to put it into words.'}</p><button type="button" className={logged ? `${quiet} w-full` : primary} onClick={() => navigate('log')}>{logged ? 'Read your demo entry' : 'Log today'}</button></Card>
          <div className="mt-1 flex flex-col gap-3.5">
            {(['problems', 'compliments'] as const).map((destination) => <button key={destination} type="button" onClick={() => navigate(destination)} className="flex min-h-[68px] cursor-pointer items-center justify-between gap-3 rounded-[20px] border border-[var(--line)] bg-white px-5 py-3.5 text-left">
              <span><strong className="block font-semibold capitalize">{destination}</strong><span className="mt-0.5 block text-sm text-[var(--ink-muted)]">{destination === 'problems' ? 'Small things, one at a time' : 'Kind words, in their own voice'}</span></span><Icon kind="next" />
            </button>)}
          </div>
        </>}
        {screen === 'log' && <>
          <button type="button" onClick={() => navigate('today')} className="flex min-h-11 w-fit cursor-pointer items-center text-[var(--ink-muted)]"><Icon kind="back" />Today</button>
          <header><h1 className={heading}>Hello, Avery.</h1><p className="mt-1.5 leading-[1.6] text-[var(--ink-muted)]">Ten seconds. How did today actually go?</p></header>
          <Card><form onSubmit={(event) => { event.preventDefault(); if (entry.trim()) { setLogged(true); navigate('today'); } }}>
            <label htmlFor="demo-entry" className="mb-2 block text-sm text-[var(--ink-muted)]">A moment from your day</label>
            <textarea id="demo-entry" value={entry} onChange={(event) => setEntry(event.target.value)} placeholder="Type it here." className="min-h-36 w-full resize-y rounded-[14px] border border-[var(--line)] p-4 leading-[1.6] focus-visible:outline-2 focus-visible:outline-[var(--primary)]" />
            <button type="submit" disabled={!entry.trim()} className={`${primary} mt-4`}>Keep in this demo</button>
          </form></Card><p className={caption}>This stays in this preview until you refresh or start over.</p>
        </>}
        {screen === 'problems' && <>
          <header><h1 className={heading}>Problems</h1><p className="mt-1.5 leading-[1.6] text-[var(--ink-muted)]">Small things, one at a time. There is no score here.</p></header>
          <Card><div className="flex flex-col items-center gap-3 py-2 text-center"><span className="text-[var(--sage)]"><Icon kind="today" /></span><h2 className={smallHeading}>Nothing here, and that is fine.</h2><p className="max-w-[30ch] text-sm leading-[1.5] text-[var(--ink-muted)]">When something is worth your attention, it shows up here, one at a time.</p></div></Card>
        </>}
        {screen === 'compliments' && <>
          <header><h1 className={heading}>Compliments</h1><p className="mt-1.5 leading-[1.6] text-[var(--ink-muted)]">Their words, as they wrote them.</p></header>
          <Card warm>{banked ? <><p>Banked for Sam in this demo.</p><p className="mt-1 text-sm text-[var(--ink-muted)]">A little kindness, kept close.</p></> : <form onSubmit={(event) => { event.preventDefault(); if (kindWords.trim()) setBanked(true); }}>
            <p className={`${caption} mb-2 tracking-[0.06em] uppercase`}>Today’s question</p><label htmlFor="demo-kindness" className="mb-3 block leading-[1.6]">What is one small thing Sam did that made you smile?</label>
            <input id="demo-kindness" maxLength={300} value={kindWords} onChange={(event) => setKindWords(event.target.value)} placeholder="A line is plenty." className="w-full rounded-[14px] border border-[var(--line)] bg-white px-4 py-3.5 focus-visible:outline-2 focus-visible:outline-[var(--primary)]" />
            <button type="submit" disabled={!kindWords.trim()} className={`${primary} mt-3`}>Bank it for Sam</button>
          </form>}</Card>
          <Card><h2 className={`${smallHeading} text-center`}>Nothing here yet.</h2><p className="mt-3 text-center text-sm leading-[1.5] text-[var(--ink-muted)]">Kind words land here, in their own voice, whenever they come up.</p></Card>
        </>}
      </motion.div>}
    </main>
    {showTabs && <nav aria-label="Preview navigation" className="fixed inset-x-0 bottom-0 border-t border-[var(--line)] bg-[var(--canvas)] px-4 pt-1.5 pb-[calc(6px+env(safe-area-inset-bottom))]">
      <div className="mx-auto flex max-w-[430px]">{(['today', 'problems', 'compliments'] as const).map((destination) => <button type="button" key={destination} aria-current={screen === destination ? 'page' : undefined} onClick={() => navigate(destination)} className={`flex min-h-14 flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 text-[13px] font-medium capitalize ${screen === destination ? 'text-[var(--primary-press)]' : 'text-[var(--ink-faint)]'}`}><Icon kind={destination} />{destination}</button>)}</div>
    </nav>}
  </div>;
}
