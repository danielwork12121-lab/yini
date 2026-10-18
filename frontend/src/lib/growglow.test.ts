import { describe, expect, it } from 'vitest';
import { ClassifyOutputSchema, FeedbackForSchema, GlowResponseSchema, GrowResponseSchema, isVerbatimSpan } from '@/contract';
import { mockClassify } from '@/lib/llm/mock';

describe('Glow: kind words', () => {
  const entry = 'Long day. Daniel made me breakfast this morning and it was honestly so sweet. We argued about money later.';
  it('only a literal slice of what was written counts as their words', () => {
    expect(isVerbatimSpan('Daniel made me breakfast this morning and it was honestly so sweet.', entry)).toBe(true);
    expect(isVerbatimSpan('Daniel made breakfast and it was so sweet.', entry)).toBe(false);
  });
  it('a model that lists too many kind words is trimmed, not rejected', () => {
    const base = mockClassify(entry);
    const many = { ...base, kind_words: Array.from({ length: 8 }, (_, i) => ({ text: `a kind sentence number ${i}` })) };
    const parsed = ClassifyOutputSchema.parse(many);
    expect(parsed.kind_words).toHaveLength(5);
    expect(parsed.kind_words[0].text).toBe('a kind sentence number 0');
  });
  it('the response shape carries the words and the day, and nothing that identifies the entry', () => {
    const ok = GlowResponseSchema.parse({
      partner_display_name: 'Mia',
      compliments: [{ id: crypto.randomUUID(), text: 'so sweet', said_on: '2026-10-17', is_new: true }],
    });
    expect(Object.keys(ok.compliments[0]).sort()).toEqual(['id', 'is_new', 'said_on', 'text']);
  });
});

describe('Grow: overnight feedback', () => {
  it('trims a feedback block that is a little too long instead of failing the whole night', () => {
    const long = 'x'.repeat(500);
    const parsed = FeedbackForSchema.parse({ headline: long, bullets: [long, '  ', 'two', 'three', 'four', 'five', 'six'] });
    expect(parsed.headline).toHaveLength(160);
    expect(parsed.bullets).toHaveLength(5);
    expect(parsed.bullets[0]).toHaveLength(400);
    expect(parsed.bullets).not.toContain('');
  });
  it('still insists on at least two bullets and a headline', () => {
    expect(FeedbackForSchema.safeParse({ headline: 'Hi', bullets: ['only one'] }).success).toBe(false);
    expect(FeedbackForSchema.safeParse({ headline: '', bullets: ['a', 'b'] }).success).toBe(false);
    expect(FeedbackForSchema.safeParse(null).success).toBe(false);
  });
  it('knows its four states', () => {
    for (const status of ['empty', 'working', 'ready', 'failed'] as const) {
      expect(GrowResponseSchema.parse({ partner_display_name: 'Mia', status, feedback: [], from_partner: [] }).status).toBe(status);
    }
    expect(GrowResponseSchema.safeParse({ partner_display_name: 'Mia', status: 'nope', feedback: [], from_partner: [] }).success).toBe(false);
  });
});
