/**
 * Corner — closed vocabularies.
 *
 * Every value here is a wire value: it goes in the DB, comes out of the model,
 * and is rendered by the client. Changing a string is a breaking change for all
 * three. Add members; never rename or repurpose existing ones.
 */

/* ───────────────────────────── connections ───────────────────────────── */

/**
 * One account, many connections, each fully sealed from the others.
 * The hackathon ships the UI with one; the schema has always supported many.
 */
export const CONNECTION_KINDS = ['partner', 'parent', 'sibling', 'friend', 'other'] as const;
export type ConnectionKind = (typeof CONNECTION_KINDS)[number];

/** Changes HOW the coach talks to you. Never what gets delivered, never how it speaks about them. */
export const COACH_TONES = ['warm', 'plain', 'playful', 'brief'] as const;
export type CoachTone = (typeof COACH_TONES)[number];

/* ───────────────────────────── entries ───────────────────────────── */

export const INPUT_MODES = ['voice', 'text'] as const;
export type InputMode = (typeof INPUT_MODES)[number];

/**
 * The author's state for the day, ordered worst→best. Five points matches the
 * five calendar faces and the mood-scale evidence. Drives the delivery decision;
 * never a judgement about the person.
 */
export const EMOTIONAL_STATES = ['rough', 'strained', 'steady', 'good', 'great'] as const;
export type EmotionalState = (typeof EMOTIONAL_STATES)[number];

export type MoodFace = 1 | 2 | 3 | 4 | 5;

/**
 * Closed theme vocabulary. Free-text themes are a leak vector — they smuggle
 * specifics out of the raw entry — and they make the drawers unfilterable.
 */
export const THEMES = [
  'quality_time', 'communication', 'chores_logistics', 'affection',
  'space_autonomy', 'money', 'family_friends', 'work_stress',
  'health_energy', 'future_plans', 'appreciation', 'conflict_repair', 'other',
] as const;
export type Theme = (typeof THEMES)[number];

/** 0 = nothing to carry. 3 = this matters a lot to the author. */
export type Severity = 0 | 1 | 2 | 3;

/* ───────────────────────────── concerns ───────────────────────────── */

/**
 * Lifecycle of a distilled concern. The AUTHOR sees these states — "waiting for a
 * good moment" is a promise in the spec, so a raised concern is never a black hole.
 * The RECIPIENT is never told a concern existed before it was delivered.
 */
export const CONCERN_STATUSES = [
  'open',          // distilled, waiting for a good day to land
  'queued',        // selected for today's delivery, not yet written
  'delivered',     // shipped to the partner as a nudge
  'resolved',      // partner acted and it landed
  'withdrawn',     // author's later entries show it stopped mattering
  'escalated',     // too heavy or too recurring for a nudge — staged as a conversation
] as const;
export type ConcernStatus = (typeof CONCERN_STATUSES)[number];

/** Author-facing copy for each status. The one place the app explains the wait. */
export const CONCERN_STATUS_LABELS: Record<ConcernStatus, string> = {
  open: 'Waiting for a good moment',
  queued: 'Going over soon',
  delivered: 'Passed along',
  resolved: 'Sorted',
  withdrawn: 'Set down',
  escalated: 'Worth saying in person',
};

/* ───────────────────────────── nudges ───────────────────────────── */

export const NUDGE_KINDS = [
  'self_care',       // something for you, carries nothing from your partner
  'partner_need',    // ONE thing they need, framed as something that helps you
  'partner_context', // "they're in a rough stretch, small things would land"
  'reveal',          // what they quietly did for you, from what they actually logged
  'conversation',    // staged talking points for something too heavy to mediate
] as const;
export type NudgeKind = (typeof NUDGE_KINDS)[number];

/** What the recipient did with it. No state here is a failure state. */
export const NUDGE_STATUSES = ['new', 'working', 'set_down', 'done'] as const;
export type NudgeStatus = (typeof NUDGE_STATUSES)[number];

/** Why a concern was NOT delivered today. Internal only — never rendered to anyone. */
export const HOLD_REASONS = [
  'recipient_rough_day',
  'recipient_already_received_today',
  'severity_too_low_for_now',
  'safety_hold',
  'leak_check_failed',
  'escalated_to_conversation',
] as const;
export type HoldReason = (typeof HOLD_REASONS)[number];

/* ───────────────────────────── safety ───────────────────────────── */

/**
 * `fear_coercion_abuse` halts ALL mediation for the connection: no nudges in
 * either direction, no context signals, resources surfaced instead. The product's
 * job ends there — it does not coach someone to endure something harmful.
 */
export const SAFETY_FLAGS = ['none', 'distress', 'fear_coercion_abuse'] as const;
export type SafetyFlag = (typeof SAFETY_FLAGS)[number];

/* ──────────────────────── kind words & care acts ──────────────────────── */

export const KIND_WORD_STATUSES = ['candidate', 'approved', 'surfaced', 'rejected'] as const;
export type KindWordStatus = (typeof KIND_WORD_STATUSES)[number];

/** Where a compliment came from. Quests exist to keep this supply from running dry. */
export const KIND_WORD_SOURCES = ['entry', 'quest'] as const;
export type KindWordSource = (typeof KIND_WORD_SOURCES)[number];

/** How we know an act of care happened. All three are evidence; none is inference. */
export const CARE_ACT_SOURCES = [
  'entry',              // the actor described doing it in their own log
  'nudge_followthrough',// the actor marked a nudge done and said what they did
  'quest',              // surfaced through a quest response
] as const;
export type CareActSource = (typeof CARE_ACT_SOURCES)[number];

/* ───────────────────────────── leak check ───────────────────────────── */

export const LEAK_VERDICTS = ['pass', 'fail', 'skipped', 'error'] as const;
export type LeakVerdict = (typeof LEAK_VERDICTS)[number];

/* ───────────────────────────── the pet ───────────────────────────── */

/**
 * Bond ladder. Thresholds are cumulative half-days fed — one per person per day.
 * First three rungs are reachable in a single demo sitting; that is the point.
 * Monotonic: the pet never regresses, never dies, never gets taken away.
 */
export const BOND_LEVELS = [
  { level: 1,  threshold: 1,   name: 'Just Met' },
  { level: 2,  threshold: 2,   name: 'Warming Up' },
  { level: 3,  threshold: 4,   name: 'Regulars' },
  { level: 4,  threshold: 8,   name: 'Comfy' },
  { level: 5,  threshold: 15,  name: 'In Sync' },
  { level: 6,  threshold: 30,  name: 'Inside Jokes' },
  { level: 7,  threshold: 60,  name: 'Co-Conspirators' },
  { level: 8,  threshold: 120, name: 'Old Souls' },
  { level: 9,  threshold: 240, name: 'Weatherproof' },
  { level: 10, threshold: 480, name: 'Home' },
] as const;

/** Growth stages, keyed off the same cumulative count. Stage 0 is the unhatched egg. */
export const PET_STAGES = [
  { stage: 0, threshold: 0,  key: 'egg' },
  { stage: 1, threshold: 2,  key: 'hatchling' },
  { stage: 2, threshold: 6,  key: 'young' },
  { stage: 3, threshold: 20, key: 'grown' },
  { stage: 4, threshold: 50, key: 'elder' },
] as const;

/** The egg hatches on the first day BOTH people logged. That is the pitch's emotional beat. */
export const HATCH_REQUIRES_SHARED_DAY = true;

/**
 * Pet art layers. The co-founder ships one transparent PNG per layer per species,
 * all on a common 512x512 registration. Animation is CSS transforms on these,
 * never redrawn art and never traced to SVG.
 */
export const PET_LAYERS = [
  'body', 'eyes-normal', 'eyes-happy', 'eyes-sleepy',
  'mouth-neutral', 'mouth-smile', 'blush',
] as const;
export type PetLayer = (typeof PET_LAYERS)[number];

export const PET_SPECIES = [
  'blob-bird', 'cat', 'bunny', 'frog', 'axolotl', 'capybara', 'penguin', 'fox',
] as const;
export type PetSpecies = (typeof PET_SPECIES)[number];
