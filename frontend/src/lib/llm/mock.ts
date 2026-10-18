/**
 * Keyless mock provider.
 *
 * Exists so the whole vertical path — record, save, classify, decide, compose,
 * render — runs with zero API keys, and so the demo has a fallback if the venue
 * network dies. Responses are deterministic and keyed off simple cues in the text,
 * which also makes the policy tests above reproducible end to end.
 *
 * It fabricates NOTHING that the real pipeline would not produce: concerns and
 * care acts are drawn from the input text, never invented about a partner.
 */
import type { ClassifyOutput, ComposeOutput, ContextSignalOutput, DaySummary, LeakCheckOutput } from '@/contract';
import type { EmotionalState, Theme } from '@/contract';

const ROUGH = /\b(brutal|exhausted|awful|terrible|drained|wiped|overwhelmed|hard|rough|stressed|crying|burnt? out)\b/i;
const STRAINED = /\b(tired|annoyed|frustrated|meh|off|tense|long day|busy)\b/i;
const GREAT = /\b(amazing|wonderful|great|fantastic|best|so happy|loved)\b/i;
const FEAR = /\b(afraid of (him|her|them)|hits? me|threatened|scared (of|to)|won'?t let me|controls? my|hurt me)\b/i;

function pickState(t: string): EmotionalState {
  if (ROUGH.test(t)) return 'rough';
  if (STRAINED.test(t)) return 'strained';
  if (GREAT.test(t)) return 'great';
  return /\b(good|nice|fine|better|lighter)\b/i.test(t) ? 'good' : 'steady';
}
const FACE: Record<EmotionalState, number> = { rough: 1, strained: 2, steady: 3, good: 4, great: 5 };

const DAY_EMOJI: Record<EmotionalState, string> = { rough: '😮‍💨', strained: '😕', steady: '🙂', good: '😊', great: '🎉' };

/** Keyless stand-in for the AI's cut-down: the first few real sentences, trimmed. Never invents. */
function mockJots(raw: string): string[] {
  return raw.split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.replace(/^\s*(and|so|then|but|well|um|uh)\b[,\s]*/i, '').replace(/\s+/g, ' ').trim())
    .filter((s) => s.length >= 12)
    .slice(0, 6)
    .map((s) => (s.length > 90 ? s.slice(0, 87).trimEnd() + '…' : s));
}

function firstSentenceAbout(t: string, re: RegExp): string | null {
  for (const s of t.split(/(?<=[.!?])\s+|\n+/)) if (re.test(s) && s.trim().length >= 8) return s.trim();
  return null;
}

export function mockClassify(raw: string): ClassifyOutput {
  const state = pickState(raw);
  const theme: Theme = /\b(dinner|dishes|laundry|chores|clean)\b/i.test(raw) ? 'chores_logistics'
    : /\b(time|weekend|plans?|date)\b/i.test(raw) ? 'quality_time'
    : /\b(work|boss|deadline)\b/i.test(raw) ? 'work_stress' : 'communication';

  const wantSentence = firstSentenceAbout(raw, /\b(wish|want|need|would like|never|always)\b/i);
  const praise = firstSentenceAbout(raw, /\b(love|grateful|sweet|kind|thank|laugh|proud|lucky)\b/i);
  const didFor = firstSentenceAbout(raw, /\bI (made|cooked|covered|handled|picked up|took care of|cleaned|drove|dealt with)\b/i);

  return {
    state,
    severity: state === 'rough' ? 2 : state === 'strained' ? 1 : 0,
    mood_face: FACE[state],
    themes: [theme],
    day_note: state === 'rough' ? 'A heavy one.' : state === 'great' ? 'A good one.' : 'An ordinary day.',
    jots: mockJots(raw),
    day_emoji: DAY_EMOJI[state],
    deliver_today: !['rough', 'strained'].includes(state),
    deliver_reason: `mock: state=${state}`,
    concerns: wantSentence
      ? [{ distilled_text: `would like a little more ${theme.replace(/_/g, ' ')}`, theme, severity: 1 }]
      : [],
    kind_words: praise ? [{ text: praise.slice(0, 300) }] : [],
    care_acts: didFor
      ? [{ source_span: didFor.slice(0, 300), description: didFor.replace(/^I\s+/i, '').slice(0, 160) }]
      : [],
    safety: FEAR.test(raw)
      ? { flag: 'fear_coercion_abuse', rationale: 'mock: fear/control language detected' }
      : { flag: 'none', rationale: '' },
  };
}

/** Keyless stand-in for the calendar summary. */
export function mockDaySummary(raw: string): DaySummary {
  const state = pickState(raw);
  return {
    headline: state === 'rough' ? 'A heavy one.' : state === 'great' ? 'A good one.' : 'An ordinary day.',
    emoji: DAY_EMOJI[state],
    jots: mockJots(raw),
  };
}

export function mockCompose(input: {
  state: EmotionalState; own_entry_excerpt: string;
  selected_concern: { distilled_text: string } | null; reveal_acts: string[];
}): ComposeOutput {
  const rough = ['rough', 'strained'].includes(input.state);
  return {
    acknowledgement: rough
      ? 'That sounds like a lot to carry in one day. You showed up here anyway, which counts.'
      : 'Sounds like today had some room in it. Good to hear.',
    for_you: rough
      ? 'Pick one thing off tonight and let it stay undone. Nothing here needs you at full strength.'
      : 'If there is a small thing you have been putting off, today is a reasonable day for it.',
    reveal: input.reveal_acts.length
      ? `While you were underwater, they ${input.reveal_acts.join(', and ')}. On purpose.`
      : null,
    partner_item: input.selected_concern
      ? `One small thing that would take pressure off both of you: ${input.selected_concern.distilled_text}.`
      : null,
    kind: input.selected_concern ? 'partner_need' : 'self_care',
  };
}

export function mockContextSignal(name: string): ContextSignalOutput {
  return { body_text: `${name} is in a heavier stretch than usual. Small things would land well right now — taking one thing off their plate, not needing them to plan.` };
}

/** Deliberately strict, so the mock never makes the leak metric look better than it is. */
export function mockLeakCheck(text: string): LeakCheckOutput {
  const specifics: string[] = [];
  const caps = text.match(/\b[A-Z][a-z]{2,}\b/g) ?? [];
  for (const c of caps) if (!/^(One|If|That|Sounds|While|On|Good|Pick|Nothing|You|They|The)$/.test(c)) specifics.push(c);
  if (/\b\d/.test(text)) specifics.push('a number');
  return {
    reconstructed_guess: 'mock: no reconstruction attempted',
    confidence: specifics.length ? 0.6 : 0.05,
    leaked_specifics: [...new Set(specifics)].slice(0, 10),
  };
}
