/**
 * Yini — deterministic policy.
 *
 * Pure functions, no model calls, no I/O. The model RECOMMENDS; this file DECIDES.
 * That split is deliberate: it is testable, it behaves identically on every demo
 * run, and the rules a judge will ask about are readable in one screen of code.
 */
import { BOND_LEVELS, HATCH_REQUIRES_SHARED_DAY, PET_STAGES } from './enums';
import type { EmotionalState, HoldReason, Severity, Theme } from './enums';
import type { PetState } from './models';

/* ─────────────────────────── the local day ─────────────────────────── */

/**
 * The author's local calendar day. ALWAYS use this; never `toISOString()`, which
 * rolls over at 5pm Pacific and would silently split a couple across two days.
 */
export function localDateFor(timezone: string, at: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(at); // en-CA formats as YYYY-MM-DD
}

/**
 * Step a `YYYY-MM-DD` day forwards or backwards by whole days. Built at noon UTC so a
 * daylight-saving change can never land the result on a neighbouring day.
 */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * The app's "today": the local day, moved by the testing clock's offset. The offset is
 * 0 in normal life; fast-forwarding for a demo raises it by one per day, for everyone.
 */
export function appDateFor(timezone: string, dayOffset: number, at: Date = new Date()): string {
  return addDays(localDateFor(timezone, at), dayOffset);
}

/* ──────────────────────── the delivery decision ─────────────────────── */

/** Consecutive rough/strained days after which we stop waiting and send the small one. */
export const STACK_LIMIT = 3;
/** A concern raised this many times is too recurring to nudge — it gets staged as a talk. */
export const ESCALATION_RAISES = 4;
/** Severity at or above this is never delivered as a one-line nudge. */
export const ESCALATION_SEVERITY: Severity = 3;

const HOLDING_STATES: readonly EmotionalState[] = ['rough', 'strained'];
const isHolding = (s: EmotionalState) => HOLDING_STATES.includes(s);

export interface OpenConcern {
  id: string;
  distilled_text: string;
  theme: Theme;
  severity: Severity;
  times_held: number;
  times_raised: number;
  first_raised_at: string;
}

export interface DeliveryDecisionInput {
  /** The RECIPIENT's state today — whose day decides, not the author's. */
  recipient_state: EmotionalState;
  /** Recipient's recent states, most recent first, excluding today. */
  recipient_recent_states: readonly EmotionalState[];
  /** Concerns the PARTNER raised, status 'open'. May be empty. */
  open_concerns: readonly OpenConcern[];
  already_delivered_today: boolean;
  mediation_paused: boolean;
}

export interface DeliveryDecision {
  deliver: boolean;
  concern_id: string | null;
  /** True when this should be staged as a conversation instead of nudged. */
  escalate: boolean;
  hold_reason: HoldReason | null;
  /** For logs and the judge-facing debug panel. Never shown to a user. */
  rationale: string;
}

/**
 * The one decision the whole app turns on. Order matters:
 *   safety → one-per-day → nothing waiting → escalation → stack override → rough-day hold → send.
 *
 * The stack override sits BEFORE the rough-day hold, because the entire point of
 * that rule is that it fires during a run of rough days.
 */
export function decideDelivery(input: DeliveryDecisionInput): DeliveryDecision {
  const {
    recipient_state, recipient_recent_states, open_concerns,
    already_delivered_today, mediation_paused,
  } = input;

  const no = (hold_reason: HoldReason | null, rationale: string): DeliveryDecision =>
    ({ deliver: false, concern_id: null, escalate: false, hold_reason, rationale });

  if (mediation_paused) {
    return no('safety_hold', 'Mediation halted for this connection. Nothing moves in either direction.');
  }
  if (already_delivered_today) {
    return no('recipient_already_received_today', 'One partner item per day, maximum.');
  }
  if (open_concerns.length === 0) {
    return no(null, 'Nothing waiting. Self-care reply only.');
  }

  // Too heavy or too recurring to hand over in one line — stage a conversation instead.
  const heavy = open_concerns.find(
    (c) => c.severity >= ESCALATION_SEVERITY || c.times_raised >= ESCALATION_RAISES,
  );
  if (heavy) {
    return {
      deliver: false, concern_id: heavy.id, escalate: true,
      hold_reason: 'escalated_to_conversation',
      rationale: `Raised ${heavy.times_raised}x at severity ${heavy.severity}. A nudge will not fix this; both people get prepped separately.`,
    };
  }

  const roughRun = countLeadingRough([recipient_state, ...recipient_recent_states]);

  // "Never let something sit forever." Several rough days stacked → send the small one.
  if (isHolding(recipient_state) && roughRun >= STACK_LIMIT) {
    const smallest = pickSmallest(open_concerns);
    return {
      deliver: true, concern_id: smallest.id, escalate: false, hold_reason: null,
      rationale: `${roughRun} hard days in a row. Waiting for a good day is no longer realistic, so the lightest open item ships (severity ${smallest.severity}).`,
    };
  }

  // "Never deliver a problem to someone who's depleted."
  if (isHolding(recipient_state)) {
    return no('recipient_rough_day',
      `Recipient is having a ${recipient_state} day (${roughRun} in a row). Holding ${open_concerns.length} item(s).`);
  }

  const chosen = pickMostPressing(open_concerns);
  return {
    deliver: true, concern_id: chosen.id, escalate: false, hold_reason: null,
    rationale: `Recipient is ${recipient_state}. Delivering the most pressing open item (severity ${chosen.severity}, held ${chosen.times_held}x).`,
  };
}

function countLeadingRough(states: readonly EmotionalState[]): number {
  let n = 0;
  for (const s of states) { if (!isHolding(s)) break; n++; }
  return n;
}

/** Highest severity wins; ties go to whatever has waited longest. */
function pickMostPressing(cs: readonly OpenConcern[]): OpenConcern {
  return [...cs].sort((a, b) =>
    b.severity - a.severity || b.times_held - a.times_held ||
    a.first_raised_at.localeCompare(b.first_raised_at))[0];
}

/** Lowest severity wins — on a bad day you get the small ask, not the big one. */
function pickSmallest(cs: readonly OpenConcern[]): OpenConcern {
  return [...cs].sort((a, b) =>
    a.severity - b.severity || b.times_held - a.times_held ||
    a.first_raised_at.localeCompare(b.first_raised_at))[0];
}

/* ────────────────────── the partner context signal ────────────────────── */

/**
 * "They're in a rough stretch; small things would land right now."
 *
 * This is the most sensitive surface in the product, because it is the only place
 * anything about one person's state reaches the other. It sits behind three guards
 * and a kill switch, because a signal that fires on a single bad day is trivially
 * invertible — the recipient learns exactly what was logged and when.
 *
 *   1. Never on a single bad day. Requires a RUN.
 *   2. Never says why. The caller may pass no themes and no text to the composer.
 *   3. Once per stretch, with a cooldown, so frequency itself carries no information.
 *
 * Kill it entirely with CONTEXT_SIGNAL_ENABLED=false.
 */
export const CONTEXT_SIGNAL_MIN_RUN = 2;
export const CONTEXT_SIGNAL_COOLDOWN_DAYS = 5;

export interface ContextSignalDecisionInput {
  /** The STRUGGLING person's states, most recent first, including today. */
  subject_recent_states: readonly EmotionalState[];
  /** Days since the last context signal sent to the partner. Null if never. */
  days_since_last_signal: number | null;
  mediation_paused: boolean;
  enabled: boolean;
}

export function shouldSendContextSignal(input: ContextSignalDecisionInput): { send: boolean; reason: string } {
  if (!input.enabled) return { send: false, reason: 'Context signals disabled.' };
  if (input.mediation_paused) return { send: false, reason: 'Mediation halted.' };

  const run = countLeadingRough(input.subject_recent_states);
  if (run < CONTEXT_SIGNAL_MIN_RUN) {
    return { send: false, reason: `Only ${run} hard day(s). A single bad day is invertible — needs a run.` };
  }
  const since = input.days_since_last_signal;
  if (since !== null && since < CONTEXT_SIGNAL_COOLDOWN_DAYS) {
    return { send: false, reason: `Last signal was ${since} day(s) ago; cooldown is ${CONTEXT_SIGNAL_COOLDOWN_DAYS}.` };
  }
  return { send: true, reason: `${run} hard days in a row. Sending a no-detail "small things would land" signal.` };
}

/* ───────────────────────────── the reveal ───────────────────────────── */

/**
 * The emotional engine: finding out someone quietly took care of you.
 * Fires when the recipient has come UP out of a rough stretch and there are
 * unrevealed, evidence-backed acts waiting.
 *
 * Never fires on an empty set — "never report non-participation" means if your
 * partner did nothing, you simply get no reveal, not a notice that they didn't.
 */
export function shouldReveal(args: {
  recipient_state: EmotionalState;
  recipient_previous_states: readonly EmotionalState[];
  unrevealed_act_count: number;
}): { reveal: boolean; reason: string } {
  if (args.unrevealed_act_count === 0) {
    return { reveal: false, reason: 'Nothing logged. No reveal, and no mention that there is none.' };
  }
  if (isHolding(args.recipient_state)) {
    return { reveal: false, reason: 'Still depleted. The reveal lands when they can feel it.' };
  }
  const cameUp = countLeadingRough(args.recipient_previous_states) >= 1;
  if (!cameUp) {
    return { reveal: false, reason: 'No rough stretch to come up out of.' };
  }
  return { reveal: true, reason: `Recipient is ${args.recipient_state} after a rough stretch; ${args.unrevealed_act_count} act(s) to surface.` };
}

/* ───────────────────────────── the pet ───────────────────────────── */

/**
 * Derived on every read from the feeding count. Nothing stored means nothing can
 * desync and no column exists that anyone could decrement.
 *
 * `you_fed_today` is reported; whether your PARTNER fed today is deliberately not.
 * A half-fed pet shows as half-fed without naming who is missing.
 */
export function derivePetState(args: {
  name: string;
  species: string | null;
  hatched_at: string | null;
  xp: number;
  total_half_days: number;
  you_fed_today: boolean;
  both_fed_today: boolean;
}): PetState {
  const total = Math.max(0, args.total_half_days);
  const hatched = HATCH_REQUIRES_SHARED_DAY ? args.hatched_at !== null : total > 0;

  const rawStage = [...PET_STAGES].reverse().find((s) => total >= s.threshold) ?? PET_STAGES[0];
  const stage = hatched ? rawStage : PET_STAGES[0];   // an unhatched egg is always stage 0
  const bond = [...BOND_LEVELS].reverse().find((b) => total >= b.threshold);
  const next = BOND_LEVELS.find((b) => b.threshold > total);

  return {
    name: args.name,
    species: hatched ? args.species : null,
    hatched,
    total_half_days: total,
    xp: Math.max(0, args.xp),
    stage: stage.stage,
    stage_key: stage.key,
    bond_level: bond?.level ?? 0,
    bond_name: bond?.name ?? 'Egg',
    next_threshold: next?.threshold ?? null,
    you_fed_today: args.you_fed_today,
    both_fed_today: args.both_fed_today,
  };
}

/* ────────────────────────── integrity guards ────────────────────────── */

/**
 * A kind word, or the evidence span behind a care act, must be a literal slice of
 * what its author actually wrote. The model is asked for a substring; this verifies
 * it rather than trusting it. Failures are dropped silently — we never show
 * invented affection, and we never name an act nobody logged.
 */
export function isVerbatimSpan(candidate: string, source: string): boolean {
  const norm = (s: string) => s.toLowerCase()
    .replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ').trim();
  const c = norm(candidate);
  return c.length >= 8 && norm(source).includes(c);
}

/**
 * Last line of defence before anything ships: no known proper nouns, no clock
 * times, no weekdays, no dates. Cheap and deterministic; runs after the leak check.
 */
export function stripsClean(
  text: string,
  forbiddenNames: readonly string[],
): { ok: boolean; hits: string[] } {
  const hits: string[] = [];
  for (const name of forbiddenNames) {
    if (name && new RegExp(`\\b${escapeRe(name)}\\b`, 'i').test(text)) hits.push(name);
  }
  if (/\b\d{1,2}:\d{2}\b/.test(text)) hits.push('time-of-day');
  if (/\b(mon|tues|wednes|thurs|fri|satur|sun)day\b/i.test(text)) hits.push('weekday');
  if (/\b\d{4}-\d{2}-\d{2}\b/.test(text)) hits.push('date');
  return { ok: hits.length === 0, hits };
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/* ─────────────────────── nightly: shingle leak check ─────────────────────── */

/**
 * Any run of this many consecutive words shared with the partner's raw text means
 * the feedback is quoting them. Cheap, deterministic, explainable on one slide, and
 * it catches a different failure from the adversarial check: literal copying.
 */
export const LEAK_SHINGLE_SPAN = 6;

/** Replaces the headline when the headline itself leaks. */
export const SAFE_HEADLINE = 'A few thoughts for you tonight.';
/** Ships when every bullet leaked. Self-care only: a worse product, a correct outcome. */
export const SAFE_BULLETS = [
  'Ask them one open question tonight about how their day really felt, then just listen.',
  'Pick one small thing that would make tomorrow a little easier for the two of you, and do just that.',
  '[notice] Think back over the last few days. Has your person done anything, even something tiny, that made things easier or warmer for you? Pick one and hold on to it.',
] as const;

const words = (t: string) =>
  t.toLowerCase().replace(/[‘’]/g, "'").match(/[a-z0-9']+/g) ?? [];

export function wordShingles(text: string, n: number = LEAK_SHINGLE_SPAN): Set<string> {
  const w = words(text);
  const out = new Set<string>();
  for (let i = 0; i + n <= w.length; i++) out.add(w.slice(i, i + n).join(' '));
  return out;
}

const STOP = new Set(('the and for are but not you your yours with that this have has had was were will would could should about from into over than then them they their there what when where which while who whom how why all any can did does done get got its just like more most much our out own she her him his now off one only other some such too very want wants wanted also been being both each few here may might must need needs said say says see seen than these those through under until upon use used way yes ' +
  'feel feels felt feeling today tonight tomorrow yesterday day days time thing things something someone really still always never maybe sure small little kind kindness warm').split(' '));

const significantWords = (t: string): Set<string> =>
  new Set((t.toLowerCase().replace(/[‘’]/g, "'").match(/[a-z0-9']+/g) ?? []).filter((w) => w.length >= 4 && !STOP.has(w)));

/**
 * Which of the adversary's recovered "specifics" are really the partner's? A specific
 * counts only if it uses a distinctive word that is in the PARTNER's entry and not in
 * the recipient's own. What someone wrote themselves is theirs to see again, so echoing
 * it back is no leak. With no partner text there is nothing to leak at all.
 */
export function specificsFromPartner(
  specifics: readonly string[],
  partnerText: string | null,
  ownText: string | null,
): string[] {
  if (!partnerText) return [];
  const theirs = significantWords(partnerText);
  const mine = significantWords(ownText ?? '');
  return specifics.filter((sp) => [...significantWords(sp)].some((w) => theirs.has(w) && !mine.has(w)));
}

/** True when `candidate` shares any n-word run with `source`. */
export function sharesSpan(candidate: string, source: string | null, n: number = LEAK_SHINGLE_SPAN): boolean {
  if (!source) return false;
  const src = wordShingles(source, n);
  if (src.size === 0) return false;
  for (const s of wordShingles(candidate, n)) if (src.has(s)) return true;
  return false;
}

/** Drop every bullet (and the headline) that quotes the partner. Never returns zero bullets. */
export function scrubFeedback(
  fb: { headline: string; bullets: readonly string[] },
  partnerRawText: string | null,
  n: number = LEAK_SHINGLE_SPAN,
): { headline: string; bullets: string[]; dropped: number } {
  let dropped = 0;
  let headline = fb.headline;
  if (sharesSpan(headline, partnerRawText, n)) { headline = SAFE_HEADLINE; dropped++; }
  const bullets = fb.bullets.filter((b) => {
    const leak = sharesSpan(b, partnerRawText, n);
    if (leak) dropped++;
    return !leak;
  });
  return { headline, bullets: bullets.length ? bullets : [...SAFE_BULLETS], dropped };
}

/* ─────────────────────── nightly: which day to analyse ─────────────────────── */

/**
 * `previous_day` (default): the cron fires after midnight and analyses the day that
 * just ended, so both people had the whole evening to write.
 * `same_day`: for demos and an evening schedule.
 *
 * Computed in the connection's timezone (side A's), never UTC.
 */
export type NightlyTarget = 'previous_day' | 'same_day';

export function nightlyTargetDay(timezone: string, target: NightlyTarget, at: Date = new Date()): string {
  const today = localDateFor(timezone, at);
  return target === 'same_day' ? today : addDays(today, -1);
}
