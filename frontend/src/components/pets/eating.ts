// Row-major poses; food remains visible through frame 10, empty bowls begin at 11.
export const eatingDurations = [500, 400, 400, 400, 350, 350, 350, 350, 400, 500, 500, 500, 500, 600, 650, 700] as const;
export const eatingFrames = eatingDurations.map((duration, i) => ({
  src: `/animations/cat/eating-v2-frames/${String(i + 1).padStart(2, '0')}.png`, duration,
}));
export const eatingDuration = eatingDurations.reduce((sum, duration) => sum + duration, 0);
