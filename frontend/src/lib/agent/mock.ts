/**
 * Keyless nightly agent. Deterministic, so the whole pipeline runs with no API key
 * and tests are reproducible.
 *
 * It DELIBERATELY adds one bullet that quotes the partner, so the shingle check is
 * exercised on every mock run. If that bullet ever reaches a user, the check is broken.
 */
import type { EmotionalState, NightlyInput, NightlyOutput } from '@/contract';

const firstSentence = (t: string | null) => (t ?? '').split(/(?<=[.!?])\s+|\n+/)[0]?.trim().slice(0, 200) ?? '';
const STATE_FOR_FACE: Record<number, EmotionalState> = { 1: 'rough', 2: 'strained', 3: 'steady', 4: 'good', 5: 'great' };

export function mockNightly(p: NightlyInput): NightlyOutput {
  const side = (s: NightlyInput['side_a']) => ({
    summary: s.entries_text
      ? `${s.display_name} wrote about their day. ${firstSentence(s.entries_text)}`.slice(0, 600)
      : `${s.display_name} did not write today.`,
    state: STATE_FOR_FACE[s.mood_face ?? 3] ?? 'steady',
    themes: ['communication' as const],
  });
  const feedbackFor = (me: NightlyInput['side_a'], partner: NightlyInput['side_a']) => {
    const bullets = [
      me.entries_text
        ? 'You put real words to today. Reread the first line you wrote and notice what you were asking for.'
        : 'A quiet day is allowed. Tomorrow, one honest line is plenty.',
      'Pick one small, concrete kindness for tomorrow and do it without announcing it.',
    ];
    const leak = (partner.entries_text ?? '').split(/\s+/).slice(0, 12).join(' ');
    if (leak.split(' ').length >= 6) bullets.push(`Your partner wrote: ${leak}`);
    return { headline: `A few thoughts for tonight, ${me.display_name}.`, bullets };
  };
  return {
    side_a: side(p.side_a),
    side_b: side(p.side_b),
    pair_summary: `As of ${p.local_date}: ${p.side_a.display_name} and ${p.side_b.display_name} are both still showing up.`,
    feedback_for_a: feedbackFor(p.side_a, p.side_b),
    feedback_for_b: feedbackFor(p.side_b, p.side_a),
  };
}
