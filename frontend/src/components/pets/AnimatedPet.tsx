'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { cat, type AvailablePet } from './catalog';
import { eatingFrames, eatingDurations, playFrames, type PlaybackSnapshot } from './eatingV3';

export type PetAnimation = 'idle' | 'blink' | 'happy' | 'feeding' | 'eating';
export type AnimatedPetProps = {
  pet?: AvailablePet;
  /** One-shot action; the component returns to idle automatically. */
  animation?: PetAnimation;
  /** Change to request an action; requests during cat eating are ignored. */
  requestId?: string | number;
  onComplete?: () => void;
  className?: string;
  playbackSpeed?: number;
  onPlaybackChange?: (state: PlaybackSnapshot) => void;
};

export function AnimatedPet({ pet = cat, animation = 'idle', requestId = 0, onComplete, ...props }: AnimatedPetProps) {
  const incoming = `${pet.id}:${animation}:${requestId}`;
  const [session, setSession] = useState({ key: incoming, animation, locked: pet.id === 'cat' && (animation === 'feeding' || animation === 'eating'), seen: incoming, petId: pet.id });
  if (incoming !== session.seen) {
    if (!session.locked || pet.id !== session.petId) {
      setSession({ key: incoming, animation, locked: pet.id === 'cat' && (animation === 'feeding' || animation === 'eating'), seen: incoming, petId: pet.id });
    } else setSession({ ...session, seen: incoming });
  }
  return <PetSession key={session.key} pet={pet} animation={session.animation}
    onComplete={() => { setSession(previous => ({ ...previous, locked: false })); onComplete?.(); }} {...props} />;
}

function PetSession({ pet, animation, onComplete, className = '', playbackSpeed = 1, onPlaybackChange }: {
  pet: AvailablePet; animation: PetAnimation; onComplete?: () => void; className?: string; playbackSpeed?: number; onPlaybackChange?: (state: PlaybackSnapshot) => void;
}) {
  const [phase, setPhase] = useState<PetAnimation>(pet.id === 'cat' && animation === 'feeding' ? 'eating' : animation);
  const [playback, setPlayback] = useState<PlaybackSnapshot>({ frame: -1, stage: 'loading' });
  const images = useRef<(HTMLImageElement | null)[]>([]);
  const [speed] = useState(() => Number.isFinite(playbackSpeed) && playbackSpeed > 0 ? playbackSpeed : 1); // Snapshot speed for the entire action.
  const observer = useRef(onPlaybackChange);
  useEffect(() => { observer.current = onPlaybackChange; }, [onPlaybackChange]);
  const reducedMotion = useReducedMotion();
  const complete = useRef(onComplete);
  const pendingAction = useRef(animation !== 'idle');
  useEffect(() => { complete.current = onComplete; }, [onComplete]);

  useEffect(() => {
    if (phase === 'eating') {
      const ready = Promise.all(eatingFrames.map((_, i) => images.current[i]?.decode()
        ?? Promise.reject(new Error('Missing eating frame'))));
      return playFrames({ ready, durations: eatingDurations, speed: speed,
        onChange: (state) => { setPlayback(state); observer.current?.(state); },
        onComplete: () => {
          setPhase('idle');
          if (pendingAction.current) { pendingAction.current = false; complete.current?.(); }
        },
      });
    }
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
  }, [phase, speed]);

  const showingEating = phase === 'eating' && playback.frame >= 0 && playback.stage !== 'fade-in' && playback.stage !== 'complete';
  const fadingOut = playback.stage === 'fade-out' && phase === 'eating';
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
              style={{ transition: phase === 'eating' && playback.stage === 'fade-in' && reducedMotion === false ? `opacity ${150 / speed}ms linear` : 'none' }}
              className={`object-contain ${!showingEating && expression === frame ? 'opacity-100' : 'opacity-0'}`} draggable={false} />
          ))}
        </motion.div>
      </motion.div>
      {eatingFrames.map((src, index) => (
        <Image key={src} ref={(node) => { images.current[index] = node; }} src={src}
          alt="" fill unoptimized loading="eager" draggable={false}
          data-eating-frame={showingEating && index === (moving ? playback.frame : 0) ? index : undefined}
          // Match the idle cat's ear-to-paw height and baseline despite the frame's transparent padding.
          style={{ transform: 'translate(8.5%, -18%) scale(1.76)', transition: fadingOut && moving ? `opacity ${150 / speed}ms linear` : 'none' }}
          className={`pointer-events-none object-contain ${showingEating && !fadingOut && index === (moving ? playback.frame : 0) ? 'opacity-100' : 'opacity-0'}`} />
      ))}
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
