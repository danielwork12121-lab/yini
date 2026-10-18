import { describe, expect, it } from 'vitest';
import { ClassifyOutputSchema } from '@/contract';
import { mockClassify } from '@/lib/llm/mock';
import {
  decodeDayNote, encodeDayNote, faceEmoji, isSingleEmoji, mergeDayNotes, noteAsSummary, normalizeJots, MAX_JOTS,
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

  it('a second check-in the same day adds to the day', () => {
    const merged = mergeDayNotes(
      { emoji: '😕', headline: 'Slow morning', jots: ['Overslept'] },
      { emoji: '🙂', headline: 'Better evening', jots: ['Overslept', 'Walk with Sam'] },
    );
    expect(merged).toEqual({ emoji: '🙂', headline: 'Better evening', jots: ['Overslept', 'Walk with Sam'] });
  });

  it('keeps the earlier headline when the new one is empty, and caps the summary', () => {
    expect(mergeDayNotes({ emoji: '🙂', headline: 'Kept', jots: [] }, { emoji: '🙂', headline: '', jots: [] }).headline).toBe('Kept');
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
