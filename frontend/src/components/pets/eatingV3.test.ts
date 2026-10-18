import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { eatingDuration, eatingDurations, eatingFrames, playFrames } from './eatingV3';

afterEach(() => vi.useRealTimers());
describe('cat eating playback', () => {
  it.each([0.5, 0.75, 1, 1.25])('plays frames once and returns after the fade at %sx', async speed => {
    vi.useFakeTimers();
    const onChange = vi.fn(), onComplete = vi.fn();
    playFrames({ ready: Promise.resolve(), durations: eatingDurations, speed, onChange, onComplete });
    await Promise.resolve();
    expect(onChange).toHaveBeenLastCalledWith({ frame: 0, stage: 'playing' });
    await vi.advanceTimersByTimeAsync(eatingDuration / speed + 20);
    expect(onChange.mock.calls.filter(([state]) => state.stage === 'playing').map(([state]) => state.frame)).toEqual(Array.from({ length: 13 }, (_, i) => i));
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenLastCalledWith({ frame: 12, stage: 'complete' });
    expect(vi.getTimerCount()).toBe(0);
    expect(eatingDuration).toBe(10500);
  });
  it('holds each frame for its specified duration', async () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    playFrames({ ready: Promise.resolve(), durations: eatingDurations, onChange, onComplete: vi.fn() });
    await Promise.resolve();
    for (let frame = 0; frame < 13; frame++) {
      await vi.advanceTimersByTimeAsync(eatingDurations[frame] - 1);
      expect(onChange).toHaveBeenLastCalledWith({ frame, stage: 'playing' });
      await vi.advanceTimersByTimeAsync(1);
    }
    expect(onChange).toHaveBeenLastCalledWith({ frame: 12, stage: 'fade-out' });
  });
  it.each([0, 1500, 10250, 10400])('cancels without completion at %sms', async ms => {
    vi.useFakeTimers();
    const onChange = vi.fn(), onComplete = vi.fn();
    const cancel = playFrames({ ready: Promise.resolve(), durations: eatingDurations, onChange, onComplete });
    if (ms) await vi.advanceTimersByTimeAsync(ms);
    cancel();
    const count = onChange.mock.calls.length;
    await vi.runAllTimersAsync();
    expect(onChange).toHaveBeenCalledTimes(count);
    expect(onComplete).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('releases playback when an image fails to decode', async () => {
    const onComplete = vi.fn();
    playFrames({ ready: Promise.reject(new Error('decode')), durations: eatingDurations, onChange: vi.fn(), onComplete });
    await Promise.resolve();
    await Promise.resolve();
    expect(onComplete).toHaveBeenCalledOnce();
  });
  it('has all 16 normalized PNG assets', () => {
    for (const frame of eatingFrames) {
      const png = readFileSync(`${process.cwd()}/public${frame}`);
      expect(png.subarray(1, 4).toString()).toBe('PNG');
      expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([578, 518]);
      expect(png[25]).toBe(6); // RGBA, preserving transparency and light fur.
    }
  });
});
