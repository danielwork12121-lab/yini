'use client';
import { useState } from 'react';
import { AnimatedPet } from '@/components/pets/AnimatedPet';

/** Last step of onboarding: meet the cat, feed it once, then go to Today. */
export function PetStep({ onBack, onDone }: { onBack: () => void; onDone: () => void }) {
  const [request, setRequest] = useState(0);
  const [fed, setFed] = useState(false);
  const [feeding, setFeeding] = useState(false);

  function feed() {
    if (feeding) return;
    setFeeding(true);
    setRequest((n) => n + 1);
  }

  return (
    <main className="ypet">
      <button type="button" className="ypet-back" onClick={onBack} aria-label="Back">
        <svg width="26" height="26" viewBox="0 0 26 26" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M16 4 L7 13 L16 22" /></svg>
      </button>

      <h1 className="ypet-title">{fed ? 'Your cat loves it' : 'Say hello to your cat'}</h1>
      <p className="ypet-sub">{fed ? 'A little love goes a long way. Today is waiting.' : 'Give your buddy a little love to begin.'}</p>

      <div className="ypet-stage">
        <AnimatedPet
          animation={request ? 'feeding' : 'idle'}
          requestId={request}
          onComplete={() => { setFeeding(false); setFed(true); }}
        />
      </div>

      {fed ? (
        <button type="button" className="ypet-btn" onClick={onDone}>Go to Today <span aria-hidden="true">›</span></button>
      ) : (
        <button type="button" className="ypet-btn" onClick={feed} disabled={feeding}>
          {feeding ? 'Mmm…' : 'Feed a little love ♥'}
        </button>
      )}
      {fed && <button type="button" className="ypet-again" onClick={feed} disabled={feeding}>Feed again ♥</button>}
      <p className="sr-only" role="status">{fed ? 'Your cat is happy.' : ''}</p>
    </main>
  );
}
