/**
 * Yini — HTTP contract. This is the file the screens build against.
 *
 * Rule for every shape here: if a field could tell you something about your partner
 * that they did not choose to send you, it is not in the shape. There is no
 * `partner_checked_in`, no `partner_streak`, no `partner_state`, no `last_seen`.
 * The omissions are the product.
 */
import { z } from 'zod';
import {
  ANALYSIS_STATUSES, CONCERN_STATUSES, CONNECTION_KINDS, EMOTIONAL_STATES, INPUT_MODES,
  NUDGE_KINDS, NUDGE_STATUSES, PET_SPECIES, THEMES,
} from './enums';
import { PetStateSchema } from './models';

const zUuid = z.string().uuid();
const zLocalDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** Uniform error envelope. Every route returns this shape on failure. */
export const ApiErrorSchema = z.object({
  error: z.string(),
  code: z.enum([
    'unauthenticated', 'no_connection', 'already_checked_in', 'invalid_input',
    'transcription_failed', 'model_failed', 'rate_limited', 'server_error',
    'forbidden', 'not_found', 'conflict',
  ]),
  /** True when the client should keep the user's text and offer a retry. */
  recoverable: z.boolean().default(true),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

/* ── sanitized wire views ───────────────────────────────────────────── */

/** A row in Problems. No ids or text that trace back to an entry. */
export const NudgeViewSchema = z.object({
  id: zUuid,
  kind: z.enum(NUDGE_KINDS),
  body_text: z.string(),
  theme: z.enum(THEMES).nullable(),
  delivered_on: zLocalDate,
  status: z.enum(NUDGE_STATUSES),
});
export type NudgeView = z.infer<typeof NudgeViewSchema>;

/** A row in Compliments. Verbatim partner text, by design. */
export const KindWordViewSchema = z.object({
  id: zUuid,
  text: z.string(),
  from_name: z.string(),
  surfaced_on: zLocalDate,
});
export type KindWordView = z.infer<typeof KindWordViewSchema>;

/**
 * The author's own view of what they raised. "Waiting for a good moment" —
 * never silence, never a black hole. Only ever visible to the person who raised it.
 */
export const PendingConcernViewSchema = z.object({
  id: zUuid,
  distilled_text: z.string(),
  theme: z.enum(THEMES),
  status: z.enum(CONCERN_STATUSES),
  status_label: z.string(),
  first_raised_at: z.string(),
});
export type PendingConcernView = z.infer<typeof PendingConcernViewSchema>;

/* ── POST /api/transcribe ───────────────────────────────────────────── */
// multipart/form-data, field `audio` (webm/mp4/wav), ≤25MB.
// The audio is saved BEFORE transcription is attempted; a failure never loses the entry.
export const TranscribeResponseSchema = z.object({
  text: z.string(),
  duration_ms: z.number().int().nonnegative(),
  audio_path: z.string().nullable(),
  failed: z.boolean().default(false),
});
export type TranscribeResponse = z.infer<typeof TranscribeResponseSchema>;

/* ── POST /api/checkin ──────────────────────────────────────────────── */

export const CheckinRequestSchema = z.object({
  text: z.string().min(1).max(8000).describe("The user's own words. Required either way; voice arrives already transcribed."),
  input_mode: z.enum(INPUT_MODES),
  connection_id: zUuid.nullable().default(null).describe('Null means your default connection.'),
  audio_path: z.string().nullable().default(null),
  audio_duration_ms: z.number().int().nonnegative().nullable().default(null),
  transcript_failed: z.boolean().default(false),
  local_date: zLocalDate.describe('Computed client-side from the device clock, YYYY-MM-DD.'),
});
export type CheckinRequest = z.infer<typeof CheckinRequestSchema>;

/** The screen after you hit send. This is the one vertical path. */
export const CheckinResponseSchema = z.object({
  entry_id: zUuid,
  mood_face: z.number().int().min(1).max(5),

  reply: z.object({
    acknowledgement: z.string(),
    for_you: z.string(),
    /** What they quietly did for you. Null when nothing was logged — say nothing. */
    reveal: z.string().nullable(),
    /** Null means nothing was carried today. The UI must not imply something is missing. */
    partner_item: z.string().nullable(),
    nudge_id: zUuid.nullable(),
  }),

  pet: PetStateSchema,
  /** True on the check-in that completes the first shared day. Fire the hatch animation. */
  pet_hatched_now: z.boolean().default(false),

  /** Non-null ONLY for the user who tripped it. Mediation is already halted. */
  safety: z.object({
    level: z.enum(['distress', 'fear_coercion_abuse']),
    message: z.string(),
    resources: z.array(z.object({ label: z.string(), detail: z.string() })),
  }).nullable(),
});
export type CheckinResponse = z.infer<typeof CheckinResponseSchema>;

/* ── GET /api/today ─────────────────────────────────────────────────── */
export const TodayResponseSchema = z.object({
  you_checked_in: z.boolean(),
  local_date: zLocalDate,
  display_name: z.string(),
  partner_display_name: z.string(),
  connection_kind: z.enum(CONNECTION_KINDS),
  pet: PetStateSchema,
  today_nudge: NudgeViewSchema.nullable(),
  /** Shared, milestone-only. Breaks quietly; nobody is told whose fault it was. */
  shared_streak: z.number().int().nonnegative(),
});
export type TodayResponse = z.infer<typeof TodayResponseSchema>;

/* ── GET /api/drawers ───────────────────────────────────────────────── */
export const DrawersResponseSchema = z.object({
  /** Never rendered as a badge count. A drawer you open, not a guilt number. */
  problems: z.array(NudgeViewSchema),
  compliments: z.array(KindWordViewSchema),
  /** What YOU raised and where it stands. Yours only. */
  your_pending: z.array(PendingConcernViewSchema),
});
export type DrawersResponse = z.infer<typeof DrawersResponseSchema>;

/* ── PATCH /api/nudges/[id] ─────────────────────────────────────────── */
export const NudgeUpdateRequestSchema = z.object({
  status: z.enum(NUDGE_STATUSES),
  /** Required when moving to `done`: the recipient's own words about what they did. */
  note: z.string().max(2000).default(''),
});
export type NudgeUpdateRequest = z.infer<typeof NudgeUpdateRequestSchema>;

export const NudgeUpdateResponseSchema = z.object({
  nudge: NudgeViewSchema,
  pet: PetStateSchema,
  /** XP awarded for follow-through. Setting something down awards nothing and costs nothing. */
  xp_gained: z.number().int().nonnegative(),
});
export type NudgeUpdateResponse = z.infer<typeof NudgeUpdateResponseSchema>;

/* ── POST /api/nudges/[id]/chat ─────────────────────────────────────── */
// "How do I actually move forward on this?" Never reaches the partner, either way.
export const NudgeChatRequestSchema = z.object({ message: z.string().min(1).max(2000) });
export type NudgeChatRequest = z.infer<typeof NudgeChatRequestSchema>;

export const NudgeChatResponseSchema = z.object({
  messages: z.array(z.object({
    id: zUuid,
    role: z.enum(['user', 'coach']),
    body: z.string(),
    created_at: z.string(),
  })),
});
export type NudgeChatResponse = z.infer<typeof NudgeChatResponseSchema>;

/* ── GET /api/calendar?month=YYYY-MM ────────────────────────────────── */
export const CalendarResponseSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  days: z.array(z.object({
    local_date: zLocalDate,
    mood_face: z.number().int().min(1).max(5),
    note: z.string().nullable(),
  })),
});
export type CalendarResponse = z.infer<typeof CalendarResponseSchema>;

/* ── quests ─────────────────────────────────────────────────────────── */
export const QuestViewSchema = z.object({
  id: zUuid,
  prompt_text: z.string(),
  completed: z.boolean(),
});
export type QuestView = z.infer<typeof QuestViewSchema>;

export const QuestSubmitRequestSchema = z.object({
  quest_id: zUuid,
  /** Each becomes a banked compliment for the partner. The user's own words, always. */
  answers: z.array(z.string().min(1).max(300)).min(1).max(5),
});
export type QuestSubmitRequest = z.infer<typeof QuestSubmitRequestSchema>;

/* ── pairing + demo ─────────────────────────────────────────────────── */
const zDisplayName = z.string().trim().max(40).optional()
  .describe('Optional. Sets your display name in the same step.');

/** GET /api/connection — drives whether the app shows /pair or /today. */
export const ConnectionStatusResponseSchema = z.object({
  paired: z.boolean(),
  display_name: z.string().nullable(),
  invite_code: z.string().nullable(),
  partner_display_name: z.string().nullable(),
});
export type ConnectionStatusResponse = z.infer<typeof ConnectionStatusResponseSchema>;

/** POST /api/connection */
export const CreateConnectionRequestSchema = z.object({
  display_name: zDisplayName,
  /** The buddy picked at sign-up. Optional so older clients still work; the pet hatches into it. */
  species: z.enum(PET_SPECIES).optional(),
});
export type CreateConnectionRequest = z.infer<typeof CreateConnectionRequestSchema>;
export const CreateConnectionResponseSchema = z.object({ invite_code: z.string().length(6) });
export type CreateConnectionResponse = z.infer<typeof CreateConnectionResponseSchema>;

/** POST /api/connection/join. Codes are read aloud, so case and whitespace are forgiven. */
export const JoinRequestSchema = z.object({
  invite_code: z.string().trim().toUpperCase().length(6, 'That code should be 6 characters'),
  display_name: zDisplayName,
});
export type JoinRequest = z.infer<typeof JoinRequestSchema>;
export const JoinResponseSchema = z.object({ ok: z.literal(true), already: z.boolean().default(false) });
export type JoinResponse = z.infer<typeof JoinResponseSchema>;

export const DemoLoginRequestSchema = z.object({ role: z.enum(['avery', 'sam']) });
export type DemoLoginRequest = z.infer<typeof DemoLoginRequestSchema>;
export const DemoLoginResponseSchema = z.object({ ok: z.literal(true), display_name: z.string() });
export type DemoLoginResponse = z.infer<typeof DemoLoginResponseSchema>;

/* ── GET /api/entries ───────────────────────────────────────────────── */

const zLimit = (max: number, dflt: number) => z.coerce.number().int().min(1).max(max).default(dflt);

/** Your own entries, newest first. Includes the nightly `ai_summary` once it exists. */
export const EntriesQuerySchema = z.object({ limit: zLimit(60, 14) });
export type EntriesQuery = z.infer<typeof EntriesQuerySchema>;
export const EntryViewSchema = z.object({
  id: zUuid,
  local_date: zLocalDate,
  text: z.string(),
  input_mode: z.enum(INPUT_MODES),
  state: z.enum(EMOTIONAL_STATES).nullable(),
  mood_face: z.number().int().min(1).max(5).nullable(),
  ai_summary: z.string().nullable(),
  created_at: z.string(),
});
export type EntryView = z.infer<typeof EntryViewSchema>;
export const EntriesResponseSchema = z.object({ entries: z.array(EntryViewSchema) });
export type EntriesResponse = z.infer<typeof EntriesResponseSchema>;

/* ── nightly feedback ───────────────────────────────────────────────── */

/** What the recipient sees. No run id, no leak metrics, nothing about the other side. */
export const DailyFeedbackViewSchema = z.object({
  id: zUuid,
  local_date: zLocalDate,
  headline: z.string(),
  bullets: z.array(z.string()),
  created_at: z.string(),
});
export type DailyFeedbackView = z.infer<typeof DailyFeedbackViewSchema>;

/** GET /api/feedback/latest */
export const FeedbackLatestResponseSchema = z.object({ feedback: DailyFeedbackViewSchema.nullable() });
export type FeedbackLatestResponse = z.infer<typeof FeedbackLatestResponseSchema>;

/** GET /api/feedback */
export const FeedbackListQuerySchema = z.object({ limit: zLimit(30, 7) });
export type FeedbackListQuery = z.infer<typeof FeedbackListQuerySchema>;
export const FeedbackListResponseSchema = z.object({ feedback: z.array(DailyFeedbackViewSchema) });
export type FeedbackListResponse = z.infer<typeof FeedbackListResponseSchema>;

/* ── running the nightly agent ──────────────────────────────────────── */

/** Operator view of a run. Deliberately omits `pair_summary`, which describes both people. */
export const AnalysisRunViewSchema = z.object({
  connection_id: zUuid,
  local_date: zLocalDate,
  status: z.enum(ANALYSIS_STATUSES),
  model: z.string().nullable(),
  tool_calls: z.number().int().nonnegative(),
  error: z.string().nullable(),
});
export type AnalysisRunView = z.infer<typeof AnalysisRunViewSchema>;
export const AnalyzeResponseSchema = z.object({ runs: z.array(AnalysisRunViewSchema) });
export type AnalyzeResponse = z.infer<typeof AnalyzeResponseSchema>;

/** POST /api/admin/analyze. Omit connection_id to sweep every eligible connection. */
export const AnalyzeRequestSchema = z.object({
  connection_id: zUuid.optional(),
  /** Defaults to each connection's target day (see NIGHTLY_TARGET). */
  local_date: zLocalDate.optional(),
  /** Re-run a day that already finished. */
  force: z.boolean().default(false),
});
export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;

/** POST /api/feedback/run. Demo mode only: "pretend it's midnight" for your own connection. */
export const RunMyAnalysisRequestSchema = z.object({ local_date: zLocalDate.optional() });
export type RunMyAnalysisRequest = z.infer<typeof RunMyAnalysisRequestSchema>;
