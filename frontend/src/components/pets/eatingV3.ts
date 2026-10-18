export const eatingFrames = Array.from({ length: 16 }, (_, frame) => `/animations/cat/eating-v3/frame-${String(frame).padStart(2, '0')}.png`);
export const eatingDurations = [800, 700, 700, 1000, 600, 600, 600, 600, 600, 800, 1000, 1000, 1200] as const;
export const returnDuration = 300;
export const eatingDuration = eatingDurations.reduce((sum, ms) => sum + ms, 0) + returnDuration;
export type PlaybackStage = 'loading' | 'playing' | 'fade-out' | 'fade-in' | 'complete';
export type PlaybackSnapshot = { frame: number; stage: PlaybackStage };

/** Reusable one-shot scheduler; cancellation also invalidates pending preloads.
 * Only frame/stage changes notify React. No interval or per-refresh renders.
 */
export function playFrames({ ready, durations, speed = 1, onChange, onComplete }: {
  ready: Promise<unknown>; durations: readonly number[]; speed?: number;
  onChange: (state: PlaybackSnapshot) => void; onComplete: () => void;
}) {
  let cancelled = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const rate = Number.isFinite(speed) && speed > 0 ? speed : 1;
  const later = (fn: () => void, ms: number) => { timer = setTimeout(() => { if (!cancelled) fn(); }, ms / rate); };
  const finish = () => { onChange({ frame: durations.length - 1, stage: 'complete' }); onComplete(); };
  ready.then(() => {
    if (cancelled) return;
    let frame = 0;
    const show = () => {
      onChange({ frame, stage: 'playing' });
      later(() => {
        if (++frame < durations.length) show();
        else {
          onChange({ frame: frame - 1, stage: 'fade-out' });
          later(() => {
            onChange({ frame: frame - 1, stage: 'fade-in' });
            later(finish, returnDuration / 2);
          }, returnDuration / 2);
        }
      }, durations[frame]);
    };
    show();
  }).catch(() => { if (!cancelled) finish(); });
  return () => { cancelled = true; clearTimeout(timer); };
}
