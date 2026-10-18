'use client';
import { AnimatedPet } from '@/components/pets/AnimatedPet';
import { PlantIcon } from './icons';

/** The little room from the home design, with your cat standing on the rug. */
export function Room({ request = 0, action = 'feeding', happy = false, onComplete, feed }: {
  request?: number; action?: 'feeding' | 'happy'; happy?: boolean; onComplete?: () => void; feed?: React.ReactNode;
}) {
  return (
    <div className="room" data-happy={happy}>
      <div className="room-window" aria-hidden="true" />
      <div className="room-floor" aria-hidden="true" />
      <div className="room-rug" aria-hidden="true" />
      <div className="room-plant"><PlantIcon /></div>
      <div className="room-pet">
        <AnimatedPet animation={request ? action : 'idle'} requestId={request} onComplete={onComplete} />
      </div>
      {happy && (
        <div className="room-hearts" aria-hidden="true"><i>♥</i><i>♥</i><i>♥</i></div>
      )}
      {feed && <div className="room-feed">{feed}</div>}
    </div>
  );
}
