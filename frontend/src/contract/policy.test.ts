import { describe, expect, it } from 'vitest';
import { addDays, appDateFor, nightlyTargetDay, SAFE_BULLETS, SAFE_HEADLINE, scrubFeedback, sharesSpan } from './policy';

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

describe('the testing clock', () => {
  it('steps whole days across month, year and leap-day edges', () => {
    expect(addDays('2026-10-17', 1)).toBe('2026-10-18');
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-10-17', -17)).toBe('2026-09-30');
    expect(addDays('2026-10-17', 0)).toBe('2026-10-17');
  });
  it('does not skip or repeat a day over a daylight-saving change', () => {
    expect(addDays('2026-03-07', 1)).toBe('2026-03-08');
    expect(addDays('2026-03-08', 1)).toBe('2026-03-09');
    expect(addDays('2026-11-01', 1)).toBe('2026-11-02');
  });
  it('moves today by the offset, in the person\'s own timezone', () => {
    const at = new Date('2026-10-18T05:30:00Z'); // 10:30pm on the 17th in Los Angeles
    expect(appDateFor('America/Los_Angeles', 0, at)).toBe('2026-10-17');
    expect(appDateFor('America/Los_Angeles', 1, at)).toBe('2026-10-18');
    expect(appDateFor('America/Los_Angeles', 3, at)).toBe('2026-10-20');
    expect(appDateFor('Asia/Tokyo', 1, at)).toBe('2026-10-19');
  });
});
