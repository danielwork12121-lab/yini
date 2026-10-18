import { describe, expect, it } from 'vitest';
import { COOLDOWN_MS, overnightDecision, STALE_MS } from './overnight-policy';

const NOW = Date.parse('2026-10-18T09:00:00Z');
const ago = (ms: number) => new Date(NOW - ms).toISOString();

describe('overnightDecision: when the overnight read starts', () => {
  it('starts when a finished day has never been read', () => {
    expect(overnightDecision(null, NOW)).toBe('run');
  });
  it('leaves a finished or skipped day alone', () => {
    expect(overnightDecision({ status: 'done', started_at: ago(5 * 86_400_000) }, NOW)).toBe('settled');
    expect(overnightDecision({ status: 'skipped', started_at: ago(1000) }, NOW)).toBe('settled');
  });
  it('waits for a read that is already running, so two phones never start two', () => {
    expect(overnightDecision({ status: 'running', started_at: ago(5_000) }, NOW)).toBe('wait');
    expect(overnightDecision({ status: 'running', started_at: ago(STALE_MS - 1) }, NOW)).toBe('wait');
  });
  it('restarts a read that died mid-run', () => {
    expect(overnightDecision({ status: 'running', started_at: ago(STALE_MS + 1) }, NOW)).toBe('run');
  });
  it('does not hammer a broken model: a failure cools off, then retries', () => {
    expect(overnightDecision({ status: 'failed', started_at: ago(COOLDOWN_MS - 1) }, NOW)).toBe('settled');
    expect(overnightDecision({ status: 'failed', started_at: ago(COOLDOWN_MS + 1) }, NOW)).toBe('run');
  });
});
