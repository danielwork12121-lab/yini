/**
 * Corner — database row shapes.
 *
 * These mirror the Postgres tables 1:1. The Zod schema is the source of truth;
 * the TS type is inferred from it, so there is exactly one definition to change.
 *
 * ── THE ONE RULE THAT SHAPES EVERYTHING ──────────────────────────────────────
 * `JournalEntry.raw_text` is the user's own words. It is readable by exactly one
 * person (its author) and by exactly one server-side code path (the classifier,
 * running inside that author's own request). It is NEVER read by any code path
 * acting on the partner's behalf, and it is NEVER sent to a model in a request
 * triggered by the partner.
 *
 * Everything that crosses the couple boundary goes through `Concern.distilled_text`
 * or `KindWord.text`, both of which are generated, length-capped and leak-checked.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { z } from 'zod';
import {
  CONCERN_STATUSES, EMOTIONAL_STATES, HOLD_REASONS, INPUT_MODES,
  KIND_WORD_STATUSES, LEAK_VERDICTS, NUDGE_KINDS, SAFETY_FLAGS, THEMES,
} from './enums';

const zUuid = z.string().uuid();
/** Author's LOCAL calendar day, `YYYY-MM-DD`. Never derive this from a UTC timestamp. */
const zLocalDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD');
const zTimestamp = z.string(); // ISO 8601 from Postgres timestamptz
const zSeverity = z.number().int().min(0).max(3);

/** A person. One row per auth.users row. */
export const ProfileSchema = z.object({
  id: zUuid,                                  // === auth.users.id
  display_name: z.string().min(1).max(40),
  couple_id: zUuid.nullable(),                // null until paired
  timezone: z.string().default('America/Los_Angeles'), // IANA; decides the local day
  created_at: zTimestamp,
});
export type Profile = z.infer<typeof ProfileSchema>;

/** Exactly two profiles. Enforced by a trigger, not by hope. */
export const CoupleSchema = z.object({
  id: zUuid,
  invite_code: z.string().length(6),
  /** Set the moment any entry trips `fear_coercion_abuse`. Non-null = all mediation off. */
  mediation_paused_at: zTimestamp.nullable(),
  created_at: zTimestamp,
});
export type Couple = z.infer<typeof CoupleSchema>;

/**
 * A private journal entry. RLS: `author_id = auth.uid()` for ALL of
 * select/insert/update/delete. There is no policy under which a partner selects this row.
 *
 * Classification lives on the row (1:1, and it is as private as the text it describes).
 */
export const JournalEntrySchema = z.object({
  id: zUuid,
  author_id: zUuid,
  couple_id: zUuid,
  local_date: zLocalDate,

  // ── the user's own words. AI never writes into this column. ──
  raw_text: z.string().min(1).max(8000),
  input_mode: z.enum(INPUT_MODES),
  audio_path: z.string().nullable(),          // Supabase Storage key; audio is the artifact
  audio_duration_ms: z.number().int().nonnegative().nullable(),
  transcript_failed: z.boolean().default(false), // entry still saves; transcript is a convenience

  // ── classifier output, private to the author ──
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

/**
 * A distilled need, derived from one entry at write time.
 *
 * `distilled_text` is the ONLY representation of an author's concern that any
 * partner-facing code path may read. It is written to be unattributable: no quotes,
 * no names, no dates, no numbers, no incident detail. Capped at 200 chars because
 * length is itself a leak channel.
 *
 * `source_entry_id` exists for audit and for `resolved` bookkeeping. It is never
 * selected by a client. RLS denies this table to the anon/authenticated roles entirely —
 * concerns are service-role only.
 */
export const ConcernSchema = z.object({
  id: zUuid,
  couple_id: zUuid,
  author_id: zUuid,                           // who needs this. The recipient is the other member.
  source_entry_id: zUuid,                     // SERVER ONLY. Never leaves the server.

  distilled_text: z.string().min(1).max(200),
  theme: z.enum(THEMES),
  severity: zSeverity,

  status: z.enum(CONCERN_STATUSES).default('open'),
  /** Incremented each day we chose not to deliver. Drives the "stop waiting" rule. */
  times_held: z.number().int().nonnegative().default(0),
  last_hold_reason: z.enum(HOLD_REASONS).nullable(),

  first_raised_at: zTimestamp,
  delivered_at: zTimestamp.nullable(),
  created_at: zTimestamp,
});
export type Concern = z.infer<typeof ConcernSchema>;

/**
 * One delivered item in the recipient's "Things to work on" drawer.
 * `body_text` is written FOR the recipient, framed as something that helps them.
 * It is never a forwarded complaint and never quotes the partner.
 */
export const NudgeSchema = z.object({
  id: zUuid,
  couple_id: zUuid,
  recipient_id: zUuid,
  concern_id: zUuid.nullable(),               // null for a pure self_care nudge
  kind: z.enum(NUDGE_KINDS),

  body_text: z.string().min(1).max(600),
  delivered_on: zLocalDate,                   // recipient's local day

  leak_verdict: z.enum(LEAK_VERDICTS).default('skipped'),
  leak_score: z.number().min(0).max(1).nullable(),
  leak_rewrites: z.number().int().nonnegative().default(0),

  /** Set when the recipient says they did it. Unlocks the reciprocity reveal. */
  acted_at: zTimestamp.nullable(),
  acted_note: z.string().max(2000).nullable(), // recipient's own words
  created_at: zTimestamp,
});
export type Nudge = z.infer<typeof NudgeSchema>;

/**
 * Something one partner actually said about the other, in their own words.
 *
 * `text` is a VERBATIM span lifted from the author's entry — this is the one place
 * a partner's literal words reach the other person, and that is deliberate: a
 * paraphrase here would be the app inventing affection. `verbatim` must be true to
 * surface. Nothing is ever generated into this table.
 */
export const KindWordSchema = z.object({
  id: zUuid,
  couple_id: zUuid,
  author_id: zUuid,                           // who said it
  recipient_id: zUuid,                        // who it is about
  source_entry_id: zUuid,                     // SERVER ONLY

  text: z.string().min(1).max(300),
  verbatim: z.literal(true),                  // type-level guarantee: no paraphrase ships
  status: z.enum(KIND_WORD_STATUSES).default('candidate'),

  /** Links this to the nudge the recipient acted on, for the reciprocity reveal. */
  paired_nudge_id: zUuid.nullable(),
  surfaced_at: zTimestamp.nullable(),
  created_at: zTimestamp,
});
export type KindWord = z.infer<typeof KindWordSchema>;

/**
 * One row per person per day that they showed up. UNIQUE(couple_id, local_date, author_id).
 *
 * Inserted on ANY completed check-in regardless of mood. A rough day feeds the pet
 * exactly as well as a good one — that is the whole promise. Rows are never deleted.
 */
export const PetFeedingSchema = z.object({
  couple_id: zUuid,
  local_date: zLocalDate,
  author_id: zUuid,
  created_at: zTimestamp,
});
export type PetFeeding = z.infer<typeof PetFeedingSchema>;

/** Identity only. All progression is DERIVED from the feeding count — nothing to desync. */
export const PetSchema = z.object({
  couple_id: zUuid,
  name: z.string().min(1).max(24),
  species: z.string().min(1).max(24).default('blob'),
  created_at: zTimestamp,
});
export type Pet = z.infer<typeof PetSchema>;

/** Derived, never stored. Computed by `derivePetState()` in policy.ts. */
export const PetStateSchema = z.object({
  name: z.string(),
  species: z.string(),
  total_half_days: z.number().int().nonnegative(),
  stage: z.number().int().min(0).max(4),
  stage_key: z.string(),
  bond_level: z.number().int().min(0).max(10),
  bond_name: z.string(),
  next_threshold: z.number().int().nullable(),
  /** True when BOTH partners fed today. Drives the paired animation. */
  both_fed_today: z.boolean(),
  /** Whether YOU fed today. We never report whether your partner did. */
  you_fed_today: z.boolean(),
});
export type PetState = z.infer<typeof PetStateSchema>;

/** Your calendar. One face per day. Yours only — there is no partner-visible view. */
export const MoodDaySchema = z.object({
  author_id: zUuid,
  local_date: zLocalDate,
  mood_face: z.number().int().min(1).max(5),
  source: z.enum(['self', 'derived']).default('derived'),
  created_at: zTimestamp,
});
export type MoodDay = z.infer<typeof MoodDaySchema>;

/** Audit trail for safety triage. Service-role only; never rendered to the partner. */
export const SafetyEventSchema = z.object({
  id: zUuid,
  couple_id: zUuid,
  user_id: zUuid,
  entry_id: zUuid.nullable(),
  flag: z.enum(SAFETY_FLAGS),
  created_at: zTimestamp,
});
export type SafetyEvent = z.infer<typeof SafetyEventSchema>;
