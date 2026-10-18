import { describe, expect, it } from 'vitest';
import { nightlyTargetDay, SAFE_BULLETS, SAFE_HEADLINE, scrubFeedback, sharesSpan } from './policy';

const partner = 'I am so tired of always being the one who plans every single weekend for us.';

describe('shingle leak check', () => {
  it('catches six consecutive words, ignoring case and punctuation', () => {
    expect(sharesSpan('Remember: ALWAYS BEING THE ONE WHO PLANS things.', partner)).toBe(true);
  });
  it('lets five shared words through', () => {
    expect(sharesSpan('the one who plans every', partner)).toBe(false);
  });
  it('never fires with no partner text', () => {
    expect(sharesSpan('anything at all goes here today friend', null)).toBe(false);
  });
  it('normalises curly apostrophes', () => {
    expect(sharesSpan('they don’t want to talk about it', "they don't want to talk about it")).toBe(true);
  });
});

describe('scrubFeedback', () => {
  it('drops leaking bullets and counts them', () => {
    const out = scrubFeedback({ headline: 'Tonight', bullets: ['Plan something small.', 'You are always being the one who plans every time.'] }, partner);
    expect(out).toEqual({ headline: 'Tonight', bullets: ['Plan something small.'], dropped: 1 });
  });
  it('replaces a leaking headline', () => {
    expect(scrubFeedback({ headline: 'one who plans every single weekend', bullets: ['ok then fine'] }, partner).headline).toBe(SAFE_HEADLINE);
  });
  it('falls back to self-care when everything leaks, never to nothing', () => {
    const out = scrubFeedback({ headline: 'x', bullets: ['being the one who plans every single weekend'] }, partner);
    expect(out.bullets).toEqual([...SAFE_BULLETS]);
    expect(out.dropped).toBe(1);
  });
});

describe('nightlyTargetDay', () => {
  // 2026-10-18 08:30 UTC is 01:30 on the 18th in Los Angeles.
  const at = new Date('2026-10-18T08:30:00Z');
  it('previous_day is yesterday in the connection timezone', () => {
    expect(nightlyTargetDay('America/Los_Angeles', 'previous_day', at)).toBe('2026-10-17');
  });
  it('same_day is today in the connection timezone', () => {
    expect(nightlyTargetDay('America/Los_Angeles', 'same_day', at)).toBe('2026-10-18');
  });
  it('uses the zone, not UTC', () => {
    // 2026-10-18 03:00 UTC is still the 17th in Los Angeles.
    expect(nightlyTargetDay('America/Los_Angeles', 'same_day', new Date('2026-10-18T03:00:00Z'))).toBe('2026-10-17');
  });
  it('steps across month boundaries', () => {
    expect(nightlyTargetDay('UTC', 'previous_day', new Date('2026-11-01T10:00:00Z'))).toBe('2026-10-31');
  });
});
