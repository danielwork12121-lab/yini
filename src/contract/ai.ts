/**
 * Corner — model I/O contracts.
 *
 * Three calls, deliberately cheap and separate. Each one gets the narrowest
 * possible input, which is a privacy property, not just a cost one.
 *
 *   1. classifyEntry   — sees the author's raw text. Runs in the AUTHOR's request.
 *   2. composeDelivery — sees distilled concerns + today's state. NEVER sees raw text.
 *   3. leakCheck       — sees ONLY the finished nudge. No entry, no concern, no context.
 *
 * Every schema below is parsed with `.safeParse()` before use. A model response that
 * fails parsing is retried once, then falls back to a deterministic safe response —
 * it never reaches the user half-formed.
 */
import { z } from 'zod';
import { EMOTIONAL_STATES, LEAK_VERDICTS, NUDGE_KINDS, SAFETY_FLAGS, THEMES } from './enums';

const zSeverity = z.number().int().min(0).max(3);

/* ───────────────────────────── 1. CLASSIFY ───────────────────────────── */

/** Input. The only call in the system that receives `raw_text`. */
export const ClassifyInputSchema = z.object({
  raw_text: z.string().min(1).max(8000),
  /** Author's own recent states, for trend. No partner data of any kind. */
  recent_states: z.array(z.enum(EMOTIONAL_STATES)).max(7).default([]),
  partner_display_name: z.string().max(40),  // so the model can spot who is referred to
});
export type ClassifyInput = z.infer<typeof ClassifyInputSchema>;

/** A need the author expressed, already abstracted. Generated here, never later. */
export const DistilledConcernSchema = z.object({
  /**
   * Abstract statement of the NEED, in the shape "<partner> would like more/less X".
   * No quotes. No names. No dates, numbers, places, or incident detail.
   * ≤200 chars — length itself leaks.
   */
  distilled_text: z.string().min(1).max(200),
  theme: z.enum(THEMES),
  severity: zSeverity,
});
export type DistilledConcern = z.infer<typeof DistilledConcernSchema>;

/** A verbatim span of praise the author wrote about their partner. Never paraphrased. */
export const ExtractedKindWordSchema = z.object({
  /** MUST be a literal substring of raw_text. Verified in code, not trusted from the model. */
  text: z.string().min(1).max(300),
});
export type ExtractedKindWord = z.infer<typeof ExtractedKindWordSchema>;

export const ClassifyOutputSchema = z.object({
  state: z.enum(EMOTIONAL_STATES),
  severity: zSeverity,
  mood_face: z.number().int().min(1).max(5),
  themes: z.array(z.enum(THEMES)).max(3),

  /** The model's RECOMMENDATION only. `decideDelivery()` in policy.ts holds the final say. */
  deliver_today: z.boolean(),
  deliver_reason: z.string().max(200),

  concerns: z.array(DistilledConcernSchema).max(3),
  kind_words: z.array(ExtractedKindWordSchema).max(3),

  safety: z.object({
    flag: z.enum(SAFETY_FLAGS),
    rationale: z.string().max(300),
  }),
});
export type ClassifyOutput = z.infer<typeof ClassifyOutputSchema>;

/* ───────────────────────────── 2. COMPOSE ───────────────────────────── */

/**
 * Input to the coach reply. Note what is absent: the partner's raw text, the
 * partner's state, the partner's participation, any entry id. If you find yourself
 * wanting to add one of those here, that is the bug.
 */
export const ComposeInputSchema = z.object({
  recipient_display_name: z.string().max(40),
  partner_display_name: z.string().max(40),
  /** The recipient's OWN words from today — reflected back, never rewritten. */
  own_entry_excerpt: z.string().max(1200),
  state: z.enum(EMOTIONAL_STATES),
  themes: z.array(z.enum(THEMES)).max(3),
  /** At most ONE, already selected by policy. Null means self-care only today. */
  selected_concern: z.object({
    id: z.string(),
    distilled_text: z.string().max(200),
    theme: z.enum(THEMES),
  }).nullable(),
});
export type ComposeInput = z.infer<typeof ComposeInputSchema>;

export const ComposeOutputSchema = z.object({
  /** Reflects the recipient's own words back. Must not add facts they did not state. */
  acknowledgement: z.string().min(1).max(400),
  /** Something for them. Present on EVERY delivery, including rough days. */
  for_you: z.string().min(1).max(400),
  /**
   * The one partner item, framed as something that helps the recipient.
   * Null whenever `selected_concern` was null. Never phrased as a complaint,
   * a report, or "your partner said".
   */
  partner_item: z.string().max(400).nullable(),
  kind: z.enum(NUDGE_KINDS),
});
export type ComposeOutput = z.infer<typeof ComposeOutputSchema>;

/* ──────────────────────────── 3. LEAK CHECK ──────────────────────────── */

/**
 * Adversarial reconstruction. A second model gets ONLY the finished nudge text and
 * is told to guess what the partner actually wrote. It receives no entry, no concern
 * row, no couple history — if it can reconstruct specifics from the nudge alone,
 * the nudge leaks and gets rewritten.
 *
 * This is also the metric for the slide: leak rate before vs after.
 */
export const LeakCheckInputSchema = z.object({
  nudge_text: z.string().min(1).max(600),
});
export type LeakCheckInput = z.infer<typeof LeakCheckInputSchema>;

export const LeakCheckOutputSchema = z.object({
  /** The attacker's best guess at the original entry. Logged, never shown to a user. */
  reconstructed_guess: z.string().max(600),
  /** 0 = nothing recoverable. 1 = the original is plainly readable through the nudge. */
  confidence: z.number().min(0).max(1),
  /** Concrete specifics the attacker recovered: names, dates, places, incidents, numbers. */
  leaked_specifics: z.array(z.string().max(120)).max(10),
});
export type LeakCheckOutput = z.infer<typeof LeakCheckOutputSchema>;

/** Scored result after thresholding. `verdict` decides whether the nudge ships. */
export const LeakCheckResultSchema = LeakCheckOutputSchema.extend({
  verdict: z.enum(LEAK_VERDICTS),
  attempt: z.number().int().nonnegative(),
});
export type LeakCheckResult = z.infer<typeof LeakCheckResultSchema>;

/** A nudge fails if the attacker is confident OR recovered any concrete specific. */
export const LEAK_CONFIDENCE_THRESHOLD = 0.45;
/** Rewrites attempted before giving up and shipping self-care only. */
export const LEAK_MAX_REWRITES = 2;
