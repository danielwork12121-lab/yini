'use client';
import { AnimatedPet } from '@/components/pets/AnimatedPet';
import { PlantIcon } from './icons';

/** The little room from the home design, with your cat standing on the rug. */
export function Room({ request = 0, onComplete, feed }: {
  request?: number; onComplete?: () => void; feed?: React.ReactNode;
}) {
  return (
    <div className="room">
      <div className="room-window" aria-hidden="true" />
      <div className="room-floor" aria-hidden="true" />
      <div className="room-rug" aria-hidden="true" />
      <div className="room-plant"><PlantIcon /></div>
      <div className="room-pet">
        <AnimatedPet animation={request ? 'feeding' : 'idle'} requestId={request} onComplete={onComplete} />
      </div>
      {feed && <div className="room-feed">{feed}</div>}
    </div>
  );
}
