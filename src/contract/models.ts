/**
 * Corner — database row shapes. Zod schema is the source of truth; the TS type is
 * inferred, so there is exactly one definition to change.
 *
 * ── THE RULE THAT SHAPES EVERYTHING ──────────────────────────────────────────
 * `JournalEntry.raw_text` is the user's own words. Readable by exactly one person
 * (its author) and exactly one server path (the classifier, running inside that
 * author's own request). It is NEVER read by code acting on the partner's behalf
 * and NEVER sent to a model in a request the partner triggered.
 *
 * Four derived tables cross the connection boundary, and each is generated,
 * length-capped and leak-checked: Concern, KindWord, CareAct, Nudge.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { z } from 'zod';
import {
  CARE_ACT_SOURCES, COACH_TONES, CONCERN_STATUSES, CONNECTION_KINDS, EMOTIONAL_STATES,
  HOLD_REASONS, INPUT_MODES, KIND_WORD_SOURCES, KIND_WORD_STATUSES, LEAK_VERDICTS,
  NUDGE_KINDS, NUDGE_STATUSES, PET_SPECIES, SAFETY_FLAGS, THEMES,
} from './enums';

const zUuid = z.string().uuid();
/** The author's LOCAL calendar day, `YYYY-MM-DD`. Never derive this from a UTC timestamp. */
const zLocalDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD');
const zTimestamp = z.string();
const zSeverity = z.number().int().min(0).max(3);

/* ───────────────────────────── people ───────────────────────────── */

export const ProfileSchema = z.object({
  id: zUuid,                                   // === auth.users.id
  display_name: z.string().min(1).max(40),
  timezone: z.string().default('America/Los_Angeles'), // IANA; decides the local day
  /** So the daily log opens with zero taps to choose who. */
  default_connection_id: zUuid.nullable(),
  coach_tone: z.enum(COACH_TONES).default('warm'),
  /** Preferred notification window, local HH:MM. One slot for the hackathon. */
  notify_at: z.string().regex(/^\d{2}:\d{2}$/).default('20:00'),
  created_at: zTimestamp,
});
export type Profile = z.infer<typeof ProfileSchema>;

/**
 * A sealed relationship between exactly two people. A user may have many; they
 * share nothing with each other. The hackathon UI shows one.
 */
export const ConnectionSchema = z.object({
  id: zUuid,
  kind: z.enum(CONNECTION_KINDS).default('partner'),
  invite_code: z.string().length(6),
  /** Non-null the moment anything trips fear/coercion/abuse. All mediation stops. */
  mediation_paused_at: zTimestamp.nullable(),
  created_at: zTimestamp,
});
export type Connection = z.infer<typeof ConnectionSchema>;

/** Membership. A trigger enforces at most two rows per connection. */
export const ConnectionMemberSchema = z.object({
  connection_id: zUuid,
  user_id: zUuid,
  joined_at: zTimestamp,
});
export type ConnectionMember = z.infer<typeof ConnectionMemberSchema>;

/* ───────────────────────────── the journal ───────────────────────────── */

/**
 * A private entry. RLS: `author_id = auth.uid()` for select/insert/update/delete.
 * There is no policy under which a partner selects this row.
 * Classification lives here because it is as private as the text it describes.
 */
export const JournalEntrySchema = z.object({
  id: zUuid,
  author_id: zUuid,
  connection_id: zUuid,
  local_date: zLocalDate,

  // ── the user's own words. The AI never writes into this column. ──
  raw_text: z.string().min(1).max(8000),
  input_mode: z.enum(INPUT_MODES),
  audio_path: z.string().nullable(),           // Storage key; the audio is the artifact
  audio_duration_ms: z.number().int().nonnegative().nullable(),
  transcript_failed: z.boolean().default(false), // entry still saves; transcript is convenience

  // ── classifier output, as private as the text ──
  state: z.enum(EMOTIONAL_STATES).nullable(),
  severity: zSeverity.nullable(),
  themes: z.array(z.enum(THEMES)).max(3).default([]),
  mood_face: z.number().int().min(1).max(5).nullable(),
  safety_flag: z.enum(SAFETY_FLAGS).default('none'),
  classifier_model: z.string().nullable(),
  classified_at: zTimestamp.nullable(),

  created_at: zTimestamp,
});
export type JournalEntry = z.infer<typeof JournalEntrySchema>;

/* ───────────────────────────── concerns ───────────────────────────── */

/**
 * A distilled need, derived from one entry at write time.
 *
 * `distilled_text` is the ONLY representation of a concern any partner-facing path
 * may read. Written to be unattributable: no quotes, no names, no dates, no numbers,
 * no incident detail. Capped at 200 chars because length is itself a leak channel.
 *
 * RLS: the AUTHOR may read their own rows — the spec promises "waiting for a good
 * moment", never a black hole. The RECIPIENT may never read this table at all;
 * what reaches them is a Nudge.
 *
 * `source_entry_id` is service-role only and never leaves the server.
 */
export const ConcernSchema = z.object({
  id: zUuid,
  connection_id: zUuid,
  author_id: zUuid,                            // who needs this; recipient is the other member
  source_entry_id: zUuid,                      // SERVER ONLY

  distilled_text: z.string().min(1).max(200),
  theme: z.enum(THEMES),
  severity: zSeverity,

  status: z.enum(CONCERN_STATUSES).default('open'),
  /** Incremented each day we chose not to deliver. Drives the "stop waiting" rule. */
  times_held: z.number().int().nonnegative().default(0),
  last_hold_reason: z.enum(HOLD_REASONS).nullable(),
  /** How many separate entries raised this. High counts escalate to a staged conversation. */
  times_raised: z.number().int().positive().default(1),

  first_raised_at: zTimestamp,
  delivered_at: zTimestamp.nullable(),
  created_at: zTimestamp,
});
export type Concern = z.infer<typeof ConcernSchema>;

/* ───────────────────────────── nudges ───────────────────────────── */

/**
 * One delivered item for the recipient. `body_text` is written FOR them, framed as
 * something that helps them. Never a forwarded complaint, never quotes the partner.
 */
export const NudgeSchema = z.object({
  id: zUuid,
  connection_id: zUuid,
  recipient_id: zUuid,
  concern_id: zUuid.nullable(),                // null for self_care / context / reveal
  kind: z.enum(NUDGE_KINDS),

  body_text: z.string().min(1).max(900),
  delivered_on: zLocalDate,                    // recipient's local day
  theme: z.enum(THEMES).nullable(),

  status: z.enum(NUDGE_STATUSES).default('new'),
  acted_at: zTimestamp.nullable(),
  acted_note: z.string().max(2000).nullable(), // recipient's own words

  leak_verdict: z.enum(LEAK_VERDICTS).default('skipped'),
  leak_score: z.number().min(0).max(1).nullable(),
  leak_rewrites: z.number().int().nonnegative().default(0),

  created_at: zTimestamp,
});
export type Nudge = z.infer<typeof NudgeSchema>;

/** The focused chat under a Problems item: "how do I actually move forward on this?" */
export const NudgeMessageSchema = z.object({
  id: zUuid,
  nudge_id: zUuid,
  /** The coach only. This thread never reaches the partner, in either direction. */
  role: z.enum(['user', 'coach']),
  body: z.string().min(1).max(4000),
  created_at: zTimestamp,
});
export type NudgeMessage = z.infer<typeof NudgeMessageSchema>;

/* ──────────────────── kind words & acts of care ──────────────────── */

/**
 * Something one person actually SAID about the other, in their own words.
 * This is the one place a partner's literal words reach the other person, and that
 * is deliberate — a paraphrase here would be the app inventing affection.
 * `verbatim` is typed `true`, so a paraphrase cannot be constructed.
 */
export const KindWordSchema = z.object({
  id: zUuid,
  connection_id: zUuid,
  author_id: zUuid,                            // who said it
  recipient_id: zUuid,                         // who it is about
  source_entry_id: zUuid.nullable(),           // SERVER ONLY
  quest_id: zUuid.nullable(),
  source: z.enum(KIND_WORD_SOURCES).default('entry'),

  text: z.string().min(1).max(300),
  verbatim: z.literal(true),
  status: z.enum(KIND_WORD_STATUSES).default('candidate'),
  surfaced_at: zTimestamp.nullable(),
  created_at: zTimestamp,
});
export type KindWord = z.infer<typeof KindWordSchema>;

/**
 * Something one person actually DID for the other. Distinct from a kind word:
 * this is the invisible labour the reveal makes visible.
 *
 * Evidence discipline: `source_span` is a verified verbatim slice of what the actor
 * wrote, and `description` is its third-person rendering. One fabricated act of
 * kindness destroys trust in the whole system, so nothing lands here without a span.
 */
export const CareActSchema = z.object({
  id: zUuid,
  connection_id: zUuid,
  actor_id: zUuid,                             // who did it
  beneficiary_id: zUuid,                       // who it was for
  source: z.enum(CARE_ACT_SOURCES),
  source_entry_id: zUuid.nullable(),           // SERVER ONLY
  source_nudge_id: zUuid.nullable(),

  /** Verified substring of the actor's own text. Never shown raw; proves the act happened. */
  source_span: z.string().min(1).max(300),
  /** Third-person rendering shown in the reveal, e.g. "covered dinner twice". */
  description: z.string().min(1).max(160),

  occurred_on: zLocalDate,
  revealed_at: zTimestamp.nullable(),
  created_at: zTimestamp,
});
export type CareAct = z.infer<typeof CareActSchema>;

/* ───────────────────────────── quests ───────────────────────────── */

/** Short prompts that bank compliments for the other person and feed the pet. */
export const QuestSchema = z.object({
  id: zUuid,
  connection_id: zUuid,
  author_id: zUuid,
  prompt_key: z.string().min(1).max(60),
  prompt_text: z.string().min(1).max(300),
  completed_at: zTimestamp.nullable(),
  created_at: zTimestamp,
});
export type Quest = z.infer<typeof QuestSchema>;

/* ───────────────────────────── the pet ───────────────────────────── */

/**
 * Identity only. Progression is DERIVED from the feeding count, so there is no
 * column anyone could decrement — "never dies" is a property of the schema.
 */
export const PetSchema = z.object({
  connection_id: zUuid,
  name: z.string().min(1).max(24),
  /** Null until chosen. The egg defers the species decision entirely. */
  species: z.enum(PET_SPECIES).nullable(),
  /** Set on the first day BOTH people logged. The emotional beat of the pitch. */
  hatched_at: zTimestamp.nullable(),
  /** Follow-through on nudges and quests. Separate from feedings, which are attendance. */
  xp: z.number().int().nonnegative().default(0),
  created_at: zTimestamp,
});
export type Pet = z.infer<typeof PetSchema>;

/**
 * One row per person per day they showed up. UNIQUE(connection_id, local_date, author_id).
 * Inserted on ANY completed check-in regardless of mood — a brutal day feeds the pet
 * exactly as well as a great one. Rows are never deleted.
 */
export const PetFeedingSchema = z.object({
  connection_id: zUuid,
  local_date: zLocalDate,
  author_id: zUuid,
  created_at: zTimestamp,
});
export type PetFeeding = z.infer<typeof PetFeedingSchema>;

/** Derived, never stored. Computed by `derivePetState()`. */
export const PetStateSchema = z.object({
  name: z.string(),
  species: z.string().nullable(),
  hatched: z.boolean(),
  total_half_days: z.number().int().nonnegative(),
  xp: z.number().int().nonnegative(),
  stage: z.number().int().min(0).max(4),
  stage_key: z.string(),
  bond_level: z.number().int().min(0).max(10),
  bond_name: z.string(),
  next_threshold: z.number().int().nullable(),
  /** Whether YOU fed today. We never report whether your partner did. */
  you_fed_today: z.boolean(),
  /** True only when both halves are in. Drives the paired animation. */
  both_fed_today: z.boolean(),
});
export type PetState = z.infer<typeof PetStateSchema>;

/* ───────────────────────────── calendar & safety ───────────────────────────── */

/** Your calendar. One face per day. Yours only — there is no partner-visible view. */
export const MoodDaySchema = z.object({
  author_id: zUuid,
  connection_id: zUuid,
  local_date: zLocalDate,
  mood_face: z.number().int().min(1).max(5),
  source: z.enum(['self', 'derived']).default('derived'),
  /** The coach's short note on that day. Private, like everything else here. */
  note: z.string().max(400).nullable(),
  created_at: zTimestamp,
});
export type MoodDay = z.infer<typeof MoodDaySchema>;

/** Audit trail for safety triage. Service-role only; never rendered to the partner. */
export const SafetyEventSchema = z.object({
  id: zUuid,
  connection_id: zUuid,
  user_id: zUuid,
  entry_id: zUuid.nullable(),
  flag: z.enum(SAFETY_FLAGS),
  created_at: zTimestamp,
});
export type SafetyEvent = z.infer<typeof SafetyEventSchema>;
