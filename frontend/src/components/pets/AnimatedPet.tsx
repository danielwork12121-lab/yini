'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { cat, type AvailablePet } from './catalog';

export type PetAnimation = 'idle' | 'blink' | 'happy' | 'feeding';
export type AnimatedPetProps = {
  pet?: AvailablePet;
  /** One-shot action; the component returns to idle automatically. */
  animation?: PetAnimation;
  /** Change to replay the same action or cancel it with animation="idle". */
  requestId?: string | number;
  onComplete?: () => void;
  className?: string;
};

export function AnimatedPet({ pet = cat, animation = 'idle', requestId = 0, ...props }: AnimatedPetProps) {
  return <PetSession key={`${pet.id}:${animation}:${requestId}`} pet={pet} animation={animation} {...props} />;
}

function PetSession({ pet, animation, onComplete, className = '' }: {
  pet: AvailablePet; animation: PetAnimation; onComplete?: () => void; className?: string;
}) {
  const [phase, setPhase] = useState<PetAnimation>(animation);
  const reducedMotion = useReducedMotion();
  const complete = useRef(onComplete);
  const pendingAction = useRef(animation !== 'idle');
  useEffect(() => { complete.current = onComplete; }, [onComplete]);

  useEffect(() => {
    // One timer per phase, cleaned up on interruption and unmount (including Strict Mode).
    const delay = phase === 'idle' ? 3000 + Math.random() * 3000
      : phase === 'blink' ? 150 : phase === 'feeding' ? 800 : 1200;
    const timer = window.setTimeout(() => {
      const next = phase === 'idle' ? 'blink' : phase === 'feeding' ? 'happy' : 'idle';
      setPhase(next);
      if (next === 'idle' && pendingAction.current) {
        pendingAction.current = false;
        complete.current?.();
      }
    }, delay);
    return () => window.clearTimeout(timer);
  }, [phase]);

  const resting = phase === 'idle' || phase === 'blink';
  // Treat the initial unknown preference conservatively, until hydration resolves it.
  const moving = reducedMotion === false;
  const expression = phase === 'happy' ? 'happy' : phase === 'blink' ? 'blink' : 'idle';

  return (
    <div className={`relative mx-auto aspect-square w-56 max-w-full ${className}`} role="img" aria-label={`${pet.name}, ${phase}`} data-pet-state={phase}>
      <motion.div className="absolute inset-0" initial={false}
        animate={{ y: moving ? (phase === 'happy' ? [0, -14, 0] : resting ? [0, -5, 0] : 0) : 0 }}
        transition={{ duration: phase === 'happy' ? 0.5 : 4.8, repeat: moving && resting ? Infinity : 0, ease: 'easeInOut' }}>
        <motion.div className="absolute inset-0 origin-[50%_85%]" initial={false}
          animate={{ scale: moving && resting ? [1, 1.018, 1] : 1 }}
          transition={{ duration: 6.2, repeat: moving && resting ? Infinity : 0, ease: 'easeInOut' }}>
          {(['idle', 'blink', 'happy'] as const).map((frame) => (
            <Image key={frame} src={pet.artwork[frame]} alt="" fill sizes="224px" preload
              className={`object-contain ${expression === frame ? 'opacity-100' : 'opacity-0'}`} draggable={false} />
          ))}
        </motion.div>
      </motion.div>
      {phase === 'happy' && [-1, 0, 1].map((direction) => (
        <motion.span key={direction} aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/3 text-2xl text-[var(--primary)]"
          initial={{ x: direction * 34 - 12, y: 0, opacity: 1 }}
          animate={{ x: direction * (moving ? 48 : 34) - 12, y: moving ? -64 : 0, opacity: moving ? 0 : 1 }}
          transition={{ duration: 0.9, delay: moving ? (direction + 1) * 0.1 : 0 }}>♥</motion.span>
      ))}
      {phase === 'feeding' && (
        <motion.span aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 text-3xl text-[var(--primary)]"
          initial={{ x: moving ? -90 : -12, y: moving ? 65 : 0, opacity: 1, scale: 1 }}
          animate={{ x: -12, y: 0, opacity: moving ? [1, 1, 0] : 1, scale: moving ? 0.5 : 1 }}
          transition={{ duration: 0.75, ease: 'easeInOut' }}>♥</motion.span>
      )}
    </div>
  );
}
