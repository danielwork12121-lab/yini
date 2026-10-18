/**
 * Corner — model I/O contracts.
 *
 * Separate, narrow calls. Each gets the least input that can do its job, which is
 * a privacy property before it is a cost one.
 *
 *   classifyEntry     sees the author's raw text. Runs in the AUTHOR's request only.
 *   composeDelivery   sees distilled rows + the recipient's own words. Never raw partner text.
 *   composeContext    sees a run length and nothing else. No themes, no text, no why.
 *   stageConversation sees one distilled concern. Produces talking points, not a nudge.
 *   leakCheck         sees ONLY the finished output. No entry, no concern, no history.
 *
 * Every response is `.safeParse()`d. A failure is retried once, then falls back to a
 * deterministic safe reply — nothing reaches the user half-formed.
 */
import { z } from 'zod';
import { EMOTIONAL_STATES, LEAK_VERDICTS, NUDGE_KINDS, SAFETY_FLAGS, THEMES } from './enums';

const zSeverity = z.number().int().min(0).max(3);

/* ───────────────────────────── 1. CLASSIFY ───────────────────────────── */

/** The only call in the system that receives `raw_text`. */
export const ClassifyInputSchema = z.object({
  raw_text: z.string().min(1).max(8000),
  /** The author's OWN recent states, for trend. No partner data of any kind. */
  recent_states: z.array(z.enum(EMOTIONAL_STATES)).max(7).default([]),
  /** So the model can recognise who is being referred to — and strip them. */
  partner_display_name: z.string().max(40),
  author_display_name: z.string().max(40),
});
export type ClassifyInput = z.infer<typeof ClassifyInputSchema>;

/**
 * A need the author expressed, already abstracted. Generated here and nowhere else,
 * because this is the only moment raw text is in scope.
 */
export const DistilledConcernSchema = z.object({
  /**
   * The NEED, abstracted. No quotes, no names, no dates, numbers, places or incident
   * detail. ≤200 chars — length is itself a leak channel.
   */
  distilled_text: z.string().min(1).max(200),
  theme: z.enum(THEMES),
  severity: zSeverity,
});
export type DistilledConcern = z.infer<typeof DistilledConcernSchema>;

/** A verbatim slice of praise the author wrote about their partner. */
export const ExtractedKindWordSchema = z.object({
  /** MUST be a literal substring of raw_text. Verified by `isVerbatimSpan`, not trusted. */
  text: z.string().min(1).max(300),
});
export type ExtractedKindWord = z.infer<typeof ExtractedKindWordSchema>;

/**
 * Something the AUTHOR did for their partner, described in the author's own entry.
 * This is what later becomes the reveal, so the evidence discipline is strict:
 * a verified verbatim span, plus a short third-person rendering of it.
 */
export const ExtractedCareActSchema = z.object({
  /** MUST be a literal substring of raw_text. Verified in code. */
  source_span: z.string().min(1).max(300),
  /** Third-person, e.g. "covered dinner". No embellishment beyond the span. */
  description: z.string().min(1).max(160),
});
export type ExtractedCareAct = z.infer<typeof ExtractedCareActSchema>;

export const ClassifyOutputSchema = z.object({
  state: z.enum(EMOTIONAL_STATES),
  severity: zSeverity,
  mood_face: z.number().int().min(1).max(5),
  themes: z.array(z.enum(THEMES)).max(3),
  /** One short private line for the author's own calendar. Never crosses over. */
  day_note: z.string().max(200),

  /** A RECOMMENDATION. `decideDelivery()` holds the final say. */
  deliver_today: z.boolean(),
  deliver_reason: z.string().max(200),

  concerns: z.array(DistilledConcernSchema).max(3),
  kind_words: z.array(ExtractedKindWordSchema).max(3),
  care_acts: z.array(ExtractedCareActSchema).max(3),

  safety: z.object({
    flag: z.enum(SAFETY_FLAGS),
    rationale: z.string().max(300),
  }),
});
export type ClassifyOutput = z.infer<typeof ClassifyOutputSchema>;

/* ───────────────────────────── 2. COMPOSE ───────────────────────────── */

/**
 * Note what is absent: the partner's raw text, the partner's state, the partner's
 * participation, any entry id. If you find yourself wanting to add one of those,
 * that is the bug, not the gap.
 */
export const ComposeInputSchema = z.object({
  recipient_display_name: z.string().max(40),
  partner_display_name: z.string().max(40),
  coach_tone: z.string().max(20),
  /** The recipient's OWN words from today — reflected back, never rewritten. */
  own_entry_excerpt: z.string().max(1200),
  state: z.enum(EMOTIONAL_STATES),
  themes: z.array(z.enum(THEMES)).max(3),

  /** At most ONE, already chosen by policy. Null means self-care only today. */
  selected_concern: z.object({
    id: z.string(),
    distilled_text: z.string().max(200),
    theme: z.enum(THEMES),
  }).nullable(),

  /**
   * Evidence-backed acts to surface. Descriptions only — the spans stay server-side.
   * Empty array means no reveal, and the copy must not gesture at an absence.
   */
  reveal_acts: z.array(z.string().max(160)).max(5).default([]),
});
export type ComposeInput = z.infer<typeof ComposeInputSchema>;

export const ComposeOutputSchema = z.object({
  /** Reflects the recipient's own words back. Must add no facts they did not state. */
  acknowledgement: z.string().min(1).max(400),
  /** Something for them. Present on EVERY delivery, including the roughest days. */
  for_you: z.string().min(1).max(400),
  /** Names only the supplied acts. Null when `reveal_acts` was empty. */
  reveal: z.string().max(500).nullable(),
  /**
   * The one partner item, framed as something that helps the recipient. Null when
   * no concern was selected. Never a complaint, never a report, never "they said".
   * Never framed as debt — the turn is an invitation and always declinable.
   */
  partner_item: z.string().max(400).nullable(),
  kind: z.enum(NUDGE_KINDS),
});
export type ComposeOutput = z.infer<typeof ComposeOutputSchema>;

/* ─────────────────────── 3. CONTEXT SIGNAL ─────────────────────── */

/**
 * "They're in a rough stretch; small things would land."
 *
 * The input is a run length. Deliberately NOT the themes, NOT the state label, NOT
 * a word of what was written — if the composer cannot see why, the output cannot
 * leak why. `shouldSendContextSignal()` decides whether this runs at all.
 */
export const ContextSignalInputSchema = z.object({
  recipient_display_name: z.string().max(40),
  partner_display_name: z.string().max(40),
  coach_tone: z.string().max(20),
  /** How many hard days in a row. The only fact about the other person in scope. */
  run_length: z.number().int().min(2).max(14),
});
export type ContextSignalInput = z.infer<typeof ContextSignalInputSchema>;

export const ContextSignalOutputSchema = z.object({
  /** Must suggest a posture, never a cause. No topic, no timeframe, no incident. */
  body_text: z.string().min(1).max(300),
});
export type ContextSignalOutput = z.infer<typeof ContextSignalOutputSchema>;

/* ─────────────────────── 4. STAGE A CONVERSATION ─────────────────────── */

/**
 * For friction too heavy or too recurring to nudge. The app stops trying to solve
 * it and prepares both people separately, then gets out of the way.
 */
export const StageConversationInputSchema = z.object({
  recipient_display_name: z.string().max(40),
  partner_display_name: z.string().max(40),
  distilled_text: z.string().max(200),
  theme: z.enum(THEMES),
  /** Which side this prep is for. Both get their own, and they differ. */
  side: z.enum(['raiser', 'receiver']),
});
export type StageConversationInput = z.infer<typeof StageConversationInputSchema>;

export const StageConversationOutputSchema = z.object({
  opener: z.string().min(1).max(300),
  points: z.array(z.string().max(200)).min(2).max(3),
  /** The hand-back. The app's job ends at the door. */
  closing: z.string().min(1).max(200),
});
export type StageConversationOutput = z.infer<typeof StageConversationOutputSchema>;

/* ──────────────────────────── 5. LEAK CHECK ──────────────────────────── */

/**
 * Adversarial reconstruction. A second model — ideally a different provider from the
 * one that wrote the text — gets ONLY the finished output and is told to guess what
 * the partner originally wrote. No entry, no concern row, no history. If it can
 * reconstruct specifics from the output alone, the output leaks and gets rewritten.
 *
 * This is also the number for the slide: leak rate before vs after.
 */
export const LeakCheckInputSchema = z.object({
  candidate_text: z.string().min(1).max(900),
});
export type LeakCheckInput = z.infer<typeof LeakCheckInputSchema>;

export const LeakCheckOutputSchema = z.object({
  /** The attacker's best guess. Logged for the metric, never shown to any user. */
  reconstructed_guess: z.string().max(600),
  /** 0 = nothing recoverable. 1 = the original reads straight through. */
  confidence: z.number().min(0).max(1),
  /** Concrete specifics recovered: names, dates, places, incidents, numbers. */
  leaked_specifics: z.array(z.string().max(120)).max(10),
});
export type LeakCheckOutput = z.infer<typeof LeakCheckOutputSchema>;

export const LeakCheckResultSchema = LeakCheckOutputSchema.extend({
  verdict: z.enum(LEAK_VERDICTS),
  attempt: z.number().int().nonnegative(),
});
export type LeakCheckResult = z.infer<typeof LeakCheckResultSchema>;

/** Fails if the attacker is confident OR recovered any concrete specific. */
export const LEAK_CONFIDENCE_THRESHOLD = 0.45;
/** Rewrites attempted before giving up and shipping self-care only. */
export const LEAK_MAX_REWRITES = 2;

export function scoreLeak(out: LeakCheckOutput, attempt: number): LeakCheckResult {
  const failed = out.confidence >= LEAK_CONFIDENCE_THRESHOLD || out.leaked_specifics.length > 0;
  return { ...out, attempt, verdict: failed ? 'fail' : 'pass' };
}

/* ─────────────────────── 6. NIGHTLY MEDIATION ─────────────────────── */

/**
 * The nightly agent is the one call that reads BOTH people's words. Nobody triggers it
 * from a request, its output is per-recipient, and every bullet is checked twice
 * before it lands: a deterministic shingle check against the partner's raw text
 * (`scrubFeedback`) and, with a real provider, the adversarial reconstruction above.
 *
 * Memory is deliberately small: today's text, each person's recent `ai_summary`
 * lines, and the last `pair_summary`. Anything older the agent fetches with tools.
 */
export const NightlySideSchema = z.object({
  label: z.enum(['A', 'B']),
  display_name: z.string().max(40),
  /** All of this person's entries for the day, oldest first. Null when they did not write. */
  entries_text: z.string().max(24000).nullable(),
  /** Lowest mood face of the day, when the classifier set one. */
  mood_face: z.number().int().min(1).max(5).nullable(),
  /** `YYYY-MM-DD: summary` lines from earlier days, most recent first. */
  recent_summaries: z.array(z.string()).max(30),
});
export type NightlySide = z.infer<typeof NightlySideSchema>;

export const NightlyInputSchema = z.object({
  local_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  side_a: NightlySideSchema,
  side_b: NightlySideSchema,
  previous_pair_summary: z.string().nullable(),
});
export type NightlyInput = z.infer<typeof NightlyInputSchema>;

export const SideAnalysisSchema = z.object({
  /** 2-3 sentences, third person, faithful. Becomes that entry's `ai_summary`. */
  summary: z.string().min(1).max(600),
  state: z.enum(EMOTIONAL_STATES),
  themes: z.array(z.enum(THEMES)).max(3),
});
export type SideAnalysis = z.infer<typeof SideAnalysisSchema>;

export const FeedbackForSchema = z.object({
  headline: z.string().min(1).max(160),
  bullets: z.array(z.string().min(1).max(400)).min(2).max(5),
});
export type FeedbackFor = z.infer<typeof FeedbackForSchema>;

export const NightlyOutputSchema = z.object({
  side_a: SideAnalysisSchema,
  side_b: SideAnalysisSchema,
  /** 2-3 sentences carried into tomorrow's run. Server-only; never shown to either person. */
  pair_summary: z.string().min(1).max(1200),
  feedback_for_a: FeedbackForSchema,
  feedback_for_b: FeedbackForSchema,
});
export type NightlyOutput = z.infer<typeof NightlyOutputSchema>;
