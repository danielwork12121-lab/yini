'use client';
import { useState } from 'react';
import { AnimatedPet } from '@/components/pets/AnimatedPet';

/** Our Little Buddy: the cat you share. It is the one buddy for now, so changing it says so. */
export function BuddyView({ partner }: { partner: string }) {
  const [note, setNote] = useState(false);
  return (
    <>
      <div className="buddy-card">
        <div className="room-pet-static"><AnimatedPet /></div>
        <span>Shared by you and {partner}</span>
      </div>
      <button type="button" className="cta" style={{ marginTop: 'calc(50 * var(--u))' }} onClick={() => setNote(true)}>Change Buddy</button>
      <p className="fineprint" role="status">
        {note ? 'The cat is the only buddy so far. More are on their way, and you will be able to switch then.' : 'Changing your buddy keeps all your food, progress and rewards.'}
      </p>
    </>
  );
}
