'use client';
import { useEffect, useRef } from 'react';

const BARS = 7;
const REST = 0.28; // the shortest a bar gets, as a share of its full height

/**
 * The little red bars while you record. They rise and fall with your voice when the
 * browser lets us listen to the level, and keep a gentle wave going when it does not,
 * so they always look alive.
 */
export function LiveBars({ stream }: { stream: MediaStream | null }) {
  const box = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = box.current;
    if (!el || !stream) return;
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;

    let raf = 0;
    let ctx: AudioContext | null = null;
    try {
      ctx = new Ctx();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const data = new Uint8Array(analyser.fftSize);
      const bars = Array.from(el.children) as HTMLElement[];
      let level = 0;
      el.dataset.live = 'true'; // hands the bars over from the idle wave to the real level

      const tick = (t: number) => {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (const v of data) { const d = (v - 128) / 128; sum += d * d; }
        const rms = Math.sqrt(sum / data.length);               // 0 (silence) .. ~0.5 (loud)
        const target = Math.min(1, rms * 5);
        level += (target - level) * (target > level ? 0.5 : 0.12); // quick up, slow down
        bars.forEach((b, i) => {
          const wobble = 0.55 + 0.45 * Math.sin(t / 130 + i * 1.3);
          const h = REST + 0.1 * wobble + (1 - REST - 0.1) * Math.min(1, level * (0.55 + 0.7 * wobble)); // a soft ripple even in silence
          b.style.transform = `scaleY(${h.toFixed(3)})`;
        });
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    } catch { /* keep the idle wave */ }

    return () => {
      cancelAnimationFrame(raf);
      delete el.dataset.live;
      void ctx?.close().catch(() => undefined);
    };
  }, [stream]);

  return (
    <span className="bars" ref={box} aria-hidden="true">
      {Array.from({ length: BARS }, (_, i) => <i key={i} style={{ ['--i' as string]: i }} />)}
    </span>
  );
}
