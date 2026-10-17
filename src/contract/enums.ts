/**
 * Corner — closed vocabularies.
 *
 * Every value here is a wire value: it goes in the DB, comes out of the model,
 * and is rendered by the client. Changing a string here is a breaking change
 * for all three. Add new members; never rename or repurpose existing ones.
 */

/** How the user produced the entry. The user always has a text option. */
export const INPUT_MODES = ['voice', 'text'] as const;
export type InputMode = (typeof INPUT_MODES)[number];

/**
 * The author's emotional state for the day. Five points, ordered worst→best.
 * Five (not 3, not 7) matches the mood-scale research and the calendar faces.
 * This drives the delivery decision, never a judgement about the person.
 */
export const EMOTIONAL_STATES = ['rough', 'strained', 'steady', 'good', 'great'] as const;
export type EmotionalState = (typeof EMOTIONAL_STATES)[number];

/** Index into the 5 calendar faces. 1 = roughest, 5 = best. Private to the author. */
export const MOOD_FACES = [1, 2, 3, 4, 5] as const;
export type MoodFace = (typeof MOOD_FACES)[number];

/**
 * Closed theme vocabulary. The model MUST pick from this list — free-text themes
 * are a leak vector (they smuggle specifics out of the raw entry) and they make
 * the two drawers unfilterable.
 */
export const THEMES = [
  'quality_time',
  'communication',
  'chores_logistics',
  'affection',
  'space_autonomy',
  'money',
  'family_friends',
  'work_stress',
  'health_energy',
  'future_plans',
  'appreciation',
  'conflict_repair',
  'other',
] as const;
export type Theme = (typeof THEMES)[number];

/** 0 = nothing to carry. 3 = this matters a lot to the author. */
export const SEVERITIES = [0, 1, 2, 3] as const;
export type Severity = (typeof SEVERITIES)[number];

/**
 * Lifecycle of a distilled concern. Note there is no "rejected by partner" state:
 * the recipient is never told a concern existed and was dropped.
 */
export const CONCERN_STATUSES = [
  'open',       // distilled, waiting for a good day to land
  'queued',     // selected for today's delivery, not yet written
  'delivered',  // shipped to the partner as a nudge
  'resolved',   // partner acted and author confirmed it landed
  'withdrawn',  // author's later entries show it stopped mattering
] as const;
export type ConcernStatus = (typeof CONCERN_STATUSES)[number];

/** What a nudge is. A nudge is ALWAYS framed as helping its recipient. */
export const NUDGE_KINDS = [
  'self_care',    // something for you, carries nothing from your partner
  'partner_need', // one thing your partner needs, framed as something that helps you
] as const;
export type NudgeKind = (typeof NUDGE_KINDS)[number];

/** Why a concern was NOT delivered today. Internal only — never rendered. */
export const HOLD_REASONS = [
  'recipient_rough_day',
  'recipient_already_received_today',
  'severity_too_low_for_now',
  'safety_hold',
  'leak_check_failed',
] as const;
export type HoldReason = (typeof HOLD_REASONS)[number];

/**
 * Safety triage. `fear_coercion_abuse` halts ALL mediation for the couple:
 * no nudges in either direction, resources surfaced instead.
 */
export const SAFETY_FLAGS = ['none', 'distress', 'fear_coercion_abuse'] as const;
export type SafetyFlag = (typeof SAFETY_FLAGS)[number];

/** Kind-words pipeline. Nothing reaches a partner before `surfaced`. */
export const KIND_WORD_STATUSES = ['candidate', 'approved', 'surfaced', 'rejected'] as const;
export type KindWordStatus = (typeof KIND_WORD_STATUSES)[number];

/** Adversarial leak-check outcome for one generated nudge. */
export const LEAK_VERDICTS = ['pass', 'fail', 'skipped', 'error'] as const;
export type LeakVerdict = (typeof LEAK_VERDICTS)[number];

/**
 * Pet bond ladder. Thresholds are cumulative half-days fed (1 per person per day).
 * First three rungs are reachable in a single demo sitting — that is the point.
 * Growth is monotonic: the pet never regresses, never dies, never gets taken away.
 */
export const BOND_LEVELS = [
  { level: 1, threshold: 1,   name: 'Just Met' },
  { level: 2, threshold: 2,   name: 'Warming Up' },
  { level: 3, threshold: 4,   name: 'Regulars' },
  { level: 4, threshold: 8,   name: 'Comfy' },
  { level: 5, threshold: 15,  name: 'In Sync' },
  { level: 6, threshold: 30,  name: 'Inside Jokes' },
  { level: 7, threshold: 60,  name: 'Co-Conspirators' },
  { level: 8, threshold: 120, name: 'Old Souls' },
  { level: 9, threshold: 240, name: 'Weatherproof' },
  { level: 10, threshold: 480, name: 'Home' },
] as const;

/** Pet growth stages, keyed off the same cumulative count. */
export const PET_STAGES = [
  { stage: 0, threshold: 0,  key: 'egg' },
  { stage: 1, threshold: 1,  key: 'hatchling' },
  { stage: 2, threshold: 6,  key: 'young' },
  { stage: 3, threshold: 20, key: 'grown' },
  { stage: 4, threshold: 50, key: 'elder' },
] as const;
