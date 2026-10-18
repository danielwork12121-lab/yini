import { describe, expect, it } from 'vitest';
import { ClassifyOutputSchema } from '@/contract';
import { mockClassify } from '@/lib/llm/mock';
import {
  decodeDayNote, encodeDayNote, faceEmoji, isSingleEmoji, jotBudget, MAX_DAY_JOTS, noteAsSummary, normalizeJots, timeLabel, wordCount, MAX_JOTS,
} from './calendar';

describe('day notes', () => {
  it('round-trips emoji, headline and jots', () => {
    const note = { emoji: '🎉', headline: 'Big win', jots: ['Shipped the demo', 'Dinner with Sam'] };
    expect(decodeDayNote(encodeDayNote(note), 5)).toEqual(note);
  });

  it('reads older plain-text notes as a headline, with the face emoji', () => {
    expect(decodeDayNote('A heavy one.', 1)).toEqual({ emoji: '😞', headline: 'A heavy one.', jots: [] });
    expect(decodeDayNote(null, 4)).toEqual({ emoji: '🙂', headline: '', jots: [] });
    expect(decodeDayNote('{"v":1,"e":"not an emoji","h":"x","j":[1,"ok"]}', 3)).toEqual({ emoji: '😐', headline: 'x', jots: ['ok'] });
  });

  it('accepts exactly one emoji, including joined and variation-selector ones', () => {
    for (const ok of ['🙂', '🌧️', '😮‍💨', '👨‍👩‍👧', '🇺🇸']) expect(isSingleEmoji(ok), ok).toBe(true);
    for (const bad of ['', 'hi', '🙂🙂', 'a🙂', null, undefined]) expect(isSingleEmoji(bad as string), String(bad)).toBe(false);
  });

  it('cleans, dedupes and bounds jots', () => {
    const jots = normalizeJots(['• Late meeting', '- late meeting', '  ', 'x'.repeat(300), ...Array.from({ length: 30 }, (_, i) => `note ${i}`)]);
    expect(jots[0]).toBe('Late meeting');
    expect(jots).toHaveLength(MAX_JOTS);
    expect(jots[1].length).toBeLessThanOrEqual(120);
  });

  it('caps the summary line', () => {
    expect(noteAsSummary({ emoji: '🙂', headline: 'h', jots: ['a'.repeat(900)] }).length).toBeLessThanOrEqual(600);
  });

  it('maps every mood face to an emoji', () => {
    expect([1, 2, 3, 4, 5].map(faceEmoji)).toEqual(['😞', '😕', '😐', '🙂', '😄']);
  });
});

describe('mock classifier jots', () => {
  const long = 'Work was brutal today, the deadline moved up again. And then I skipped lunch to finish the report. Sam made dinner which was really sweet of him. We watched a show and I finally relaxed.';
  it('cuts a long entry into short notes that satisfy the schema', () => {
    const out = mockClassify(long);
    expect(() => ClassifyOutputSchema.parse(out)).not.toThrow();
    expect(out.jots.length).toBeGreaterThan(1);
    expect(out.jots.every((j) => j.length <= 90)).toBe(true);
    expect(isSingleEmoji(out.day_emoji)).toBe(true);
  });
  it('invents nothing for a tiny entry', () => {
    expect(mockClassify('ok').jots).toEqual([]);
  });
});

import { DaySummarySchema } from '@/contract';
import { mockDaySummary } from '@/lib/llm/mock';

describe('day summary', () => {
  it('clamps instead of rejecting, so one long note never loses the summary', () => {
    const out = DaySummarySchema.parse({ headline: 'h'.repeat(200), emoji: 7, jots: ['a'.repeat(300), '', '  ok  ', ...Array(20).fill('x')] });
    expect(out.headline).toHaveLength(80);
    expect(out.emoji).toBeUndefined();
    expect(out.jots[0]).toHaveLength(100);
    expect(out.jots[1]).toBe('ok');
    expect(out.jots).toHaveLength(10);
  });
  it('survives garbage fields', () => {
    expect(DaySummarySchema.parse({ headline: null, jots: 'nope' })).toEqual({ headline: '', emoji: undefined, jots: [] });
    expect(DaySummarySchema.parse({})).toMatchObject({ jots: [] });
  });
  it('mock summary is valid and never invents', () => {
    expect(() => DaySummarySchema.parse(mockDaySummary('Work was brutal today and the deadline moved again.'))).not.toThrow();
    expect(mockDaySummary('ok').jots).toEqual([]);
  });
});

describe('how many key points a day gets', () => {
  it('a few words keep their ideas, a ramble is condensed, and it never overflows', () => {
    expect(jotBudget(3)).toBe(0);
    expect(jotBudget(12)).toBe(1);
    expect(jotBudget(40)).toBe(2);
    expect(jotBudget(80)).toBe(3);
    expect(jotBudget(150)).toBe(4);
    expect(jotBudget(250)).toBe(5);
    expect(jotBudget(400)).toBe(MAX_DAY_JOTS);
    expect(jotBudget(5000)).toBe(MAX_DAY_JOTS);
    const budgets = [0, 5, 10, 20, 45, 90, 160, 300, 1000].map(jotBudget);
    expect([...budgets].sort((a, b) => a - b)).toEqual(budgets); // more said never means fewer points
  });
  it('the budget is a ceiling on the notes that are kept', () => {
    const many = Array.from({ length: 10 }, (_, i) => `point number ${i}`);
    expect(normalizeJots(many, 3)).toEqual(['point number 0', 'point number 1', 'point number 2']);
    expect(normalizeJots(many, 0)).toEqual([]);
  });
  it('counts words across a whole day', () => {
    expect(wordCount('  a  few   words\nhere ')).toBe(4);
    expect(wordCount('')).toBe(0);
  });
  it('labels when in the day something was said, in the person\'s own timezone', () => {
    expect(timeLabel('2026-10-17T16:12:00Z', 'America/Los_Angeles')).toBe('morning, 9:12 AM');
    expect(timeLabel('2026-10-17T22:30:00Z', 'America/Los_Angeles')).toBe('afternoon, 3:30 PM');
    expect(timeLabel('2026-10-18T03:00:00Z', 'America/Los_Angeles')).toBe('evening, 8:00 PM');
  });
});

describe('whole-day summary', () => {
  const morning = 'This morning was awful. My food never came and I was furious about it. I skipped breakfast and was late.';
  const afternoon = 'Then this afternoon things got so much better. Sam surprised me with lunch and we laughed a lot. I feel really lucky.';
  it('the keyless summary reads the whole day and respects the ceiling', () => {
    const out = mockDaySummary(`${morning}\n\n${afternoon}`, 3);
    expect(() => DaySummarySchema.parse(out)).not.toThrow();
    expect(out.jots.length).toBeLessThanOrEqual(3);
    expect(out.jots.length).toBeGreaterThan(1);
    expect(out.mood).toBeGreaterThanOrEqual(1);
    expect(out.mood).toBeLessThanOrEqual(5);
  });
  it('when much more is said than fits, the notes are spread across the day, not just its start', () => {
    const out = mockDaySummary(`${morning}\n\n${afternoon}`, 2);
    expect(out.jots).toHaveLength(2);
    expect(out.jots[1]).not.toBe(out.jots[0]);
    expect(`${morning} ${afternoon}`).toContain(out.jots[1].replace(/…$/, '').slice(0, 20));
  });
  it('a mood is a whole number from 1 to 5, whatever the model sends', () => {
    expect(DaySummarySchema.parse({ headline: 'x', jots: [], mood: 3.6 }).mood).toBe(4);
    expect(DaySummarySchema.parse({ headline: 'x', jots: [], mood: 9 }).mood).toBe(5);
    expect(DaySummarySchema.parse({ headline: 'x', jots: [], mood: '2' }).mood).toBe(2);
    expect(DaySummarySchema.parse({ headline: 'x', jots: [], mood: 'great' }).mood).toBeUndefined();
    expect(DaySummarySchema.parse({ headline: 'x', jots: [] }).mood).toBeUndefined();
    expect(DaySummarySchema.parse({ headline: 'x', jots: [], mood: null }).mood).toBeUndefined();
    expect(DaySummarySchema.parse({ headline: 'x', jots: [], mood: '' }).mood).toBeUndefined();
  });
});
