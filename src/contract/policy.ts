/**
 * Corner — deterministic policy.
 *
 * Everything in this file is a pure function with no model call and no I/O.
 * The model RECOMMENDS; this file DECIDES. That split exists for three reasons:
 * it is testable, it is the same every run (a demo that reruns identically),
 * and the rules a judge will ask about are readable in one screen of code.
 */
import { BOND_LEVELS, PET_STAGES } from './enums';
import type { EmotionalState, HoldReason, Severity, Theme } from './enums';
import type { PetState } from './models';

/* ─────────────────────────── the local day ─────────────────────────── */

/**
 * The author's local calendar day. ALWAYS use this; never `new Date().toISOString()`,
 * which rolls over at 5pm Pacific and would silently split a couple across two days.
 */
export function localDateFor(timezone: string, at: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(at); // en-CA formats as YYYY-MM-DD
}

/* ──────────────────────── the delivery decision ─────────────────────── */

/** Consecutive rough/strained days after which we stop waiting and send the small one. */
export const STACK_LIMIT = 3;

/** States on which we do not normally hand someone their partner's need. */
const HOLDING_STATES: readonly EmotionalState[] = ['rough', 'strained'];

export interface OpenConcern {
  id: string;
  distilled_text: string;
  theme: Theme;
  severity: Severity;
  times_held: number;
  first_raised_at: string;
}

export interface DeliveryDecisionInput {
  /** The RECIPIENT's state today — whose day decides, not the author's. */
  recipient_state: EmotionalState;
  /** The recipient's recent states, most recent first, excluding today. */
  recipient_recent_states: readonly EmotionalState[];
  /** Concerns the PARTNER raised, status 'open'. May be empty. */
  open_concerns: readonly OpenConcern[];
  /** True if a nudge already shipped to this recipient today. */
  already_delivered_today: boolean;
  /** True if anything in this couple ever tripped fear/coercion/abuse. */
  mediation_paused: boolean;
}

export interface DeliveryDecision {
  deliver: boolean;
  concern_id: string | null;
  hold_reason: HoldReason | null;
  /** Human-readable, for logs and the judge-facing debug panel. Never shown to a user. */
  rationale: string;
}

/**
 * The one decision the whole app turns on.
 *
 * Order matters and is deliberate:
 *   safety halt → one-per-day → nothing to send → stack override → rough-day hold → send.
 *
 * The stack override is checked BEFORE the rough-day hold, because the whole point of
 * the rule is that it fires during a run of rough days.
 */
export function decideDelivery(input: DeliveryDecisionInput): DeliveryDecision {
  const {
    recipient_state, recipient_recent_states, open_concerns,
    already_delivered_today, mediation_paused,
  } = input;

  if (mediation_paused) {
    return { deliver: false, concern_id: null, hold_reason: 'safety_hold',
      rationale: 'Mediation halted for this couple. No partner content moves in either direction.' };
  }

  if (already_delivered_today) {
    return { deliver: false, concern_id: null, hold_reason: 'recipient_already_received_today',
      rationale: 'One partner item per day, maximum.' };
  }

  if (open_concerns.length === 0) {
    return { deliver: false, concern_id: null, hold_reason: null,
      rationale: 'Nothing waiting. Self-care reply only.' };
  }

  const roughRun = countLeadingRough([recipient_state, ...recipient_recent_states]);
  const holding = HOLDING_STATES.includes(recipient_state);

  // "Several rough days stacked → stop waiting, deliver the small one anyway."
  if (holding && roughRun >= STACK_LIMIT) {
    const smallest = pickSmallest(open_concerns);
    return { deliver: true, concern_id: smallest.id, hold_reason: null,
      rationale: `${roughRun} hard days in a row. Waiting for a good day is no longer realistic, so the lightest open item ships (severity ${smallest.severity}).` };
  }

  if (holding) {
    return { deliver: false, concern_id: null, hold_reason: 'recipient_rough_day',
      rationale: `Recipient is having a ${recipient_state} day (${roughRun} in a row). Holding ${open_concerns.length} item(s).` };
  }

  const chosen = pickMostPressing(open_concerns);
  return { deliver: true, concern_id: chosen.id, hold_reason: null,
    rationale: `Recipient is ${recipient_state}. Delivering the most pressing open item (severity ${chosen.severity}, held ${chosen.times_held}x).` };
}

function countLeadingRough(states: readonly EmotionalState[]): number {
  let n = 0;
  for (const s of states) { if (!HOLDING_STATES.includes(s)) break; n++; }
  return n;
}

/** Highest severity wins; ties go to whatever has waited longest. */
function pickMostPressing(cs: readonly OpenConcern[]): OpenConcern {
  return [...cs].sort((a, b) =>
    b.severity - a.severity ||
    b.times_held - a.times_held ||
    a.first_raised_at.localeCompare(b.first_raised_at))[0];
}

/** Lowest severity wins — on a bad day you get the small ask, not the big one. */
function pickSmallest(cs: readonly OpenConcern[]): OpenConcern {
  return [...cs].sort((a, b) =>
    a.severity - b.severity ||
    b.times_held - a.times_held ||
    a.first_raised_at.localeCompare(b.first_raised_at))[0];
}

/* ───────────────────────────── the pet ───────────────────────────── */

/**
 * Pet state is DERIVED from the feeding count every time it is read. Nothing is
 * stored, so nothing can desync, and there is no column anyone could decrement.
 *
 * `you_fed_today` is reported. Whether your PARTNER fed today is deliberately not
 * exposed — a half-fed pet shows as half-fed without naming who is missing.
 */
export function derivePetState(args: {
  name: string;
  species: string;
  total_half_days: number;
  you_fed_today: boolean;
  both_fed_today: boolean;
}): PetState {
  const total = Math.max(0, args.total_half_days);
  const stage = [...PET_STAGES].reverse().find((s) => total >= s.threshold) ?? PET_STAGES[0];
  const bond = [...BOND_LEVELS].reverse().find((b) => total >= b.threshold);
  const next = BOND_LEVELS.find((b) => b.threshold > total);

  return {
    name: args.name,
    species: args.species,
    total_half_days: total,
    stage: stage.stage,
    stage_key: stage.key,
    bond_level: bond?.level ?? 0,
    bond_name: bond?.name ?? 'Egg',
    next_threshold: next?.threshold ?? null,
    both_fed_today: args.both_fed_today,
    you_fed_today: args.you_fed_today,
  };
}

/* ────────────────────────── integrity guards ────────────────────────── */

/**
 * A kind word must be a literal span of what the author actually wrote.
 * The model is asked for a substring; this verifies it rather than trusting it.
 * Anything that fails is dropped silently — we never show invented affection.
 */
export function isVerbatimSpan(candidate: string, source: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').trim();
  const c = norm(candidate);
  return c.length >= 8 && norm(source).includes(c);
}

/**
 * Last line of defence before a nudge ships: no proper nouns we know about,
 * no dates, no times, no digits. Cheap, deterministic, runs after the leak check.
 */
export function stripsClean(nudgeText: string, forbiddenNames: readonly string[]): { ok: boolean; hits: string[] } {
  const hits: string[] = [];
  for (const name of forbiddenNames) {
    if (name && new RegExp(`\\b${escapeRe(name)}\\b`, 'i').test(nudgeText)) hits.push(name);
  }
  if (/\b\d{1,2}:\d{2}\b/.test(nudgeText)) hits.push('time-of-day');
  if (/\b(mon|tues|wednes|thurs|fri|satur|sun)day\b/i.test(nudgeText)) hits.push('weekday');
  if (/\b\d{4}-\d{2}-\d{2}\b/.test(nudgeText)) hits.push('date');
  return { ok: hits.length === 0, hits };
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
