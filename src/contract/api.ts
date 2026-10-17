/**
 * Corner — HTTP contract. This is the file the screens build against.
 *
 * Rule for every response shape here: if a field could tell you something about
 * your partner that they did not choose to send you, it is not in the shape.
 * There is no `partner_checked_in`, no `partner_streak`, no `partner_state`.
 * Omissions in this file are features.
 */
import { z } from 'zod';
import { INPUT_MODES, NUDGE_KINDS, THEMES } from './enums';
import { PetStateSchema } from './models';

const zUuid = z.string().uuid();
const zLocalDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** Uniform error envelope. Every route returns this shape on failure. */
export const ApiErrorSchema = z.object({
  error: z.string(),
  code: z.enum([
    'unauthenticated', 'not_paired', 'already_checked_in', 'invalid_input',
    'transcription_failed', 'model_failed', 'rate_limited', 'server_error',
  ]),
  /** True when the client should keep the user's text and let them retry. */
  recoverable: z.boolean().default(true),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

/* ── sanitized wire views ───────────────────────────────────────────── */

/** A row in "Things to work on". Carries no ids or text that trace back to an entry. */
export const NudgeViewSchema = z.object({
  id: zUuid,
  kind: z.enum(NUDGE_KINDS),
  body_text: z.string(),
  theme: z.enum(THEMES).nullable(),
  delivered_on: zLocalDate,
  acted: z.boolean(),
});
export type NudgeView = z.infer<typeof NudgeViewSchema>;

/** A row in "Kind words". Verbatim partner text, by design. */
export const KindWordViewSchema = z.object({
  id: zUuid,
  text: z.string(),
  from_name: z.string(),
  surfaced_on: zLocalDate,
  /** Set when this is the reciprocity reveal tied to something you did. */
  paired_nudge_id: zUuid.nullable(),
});
export type KindWordView = z.infer<typeof KindWordViewSchema>;

/* ── POST /api/transcribe ───────────────────────────────────────────── */
// Request: multipart/form-data, field `audio` (webm/mp4/wav), ≤ 25MB.
export const TranscribeResponseSchema = z.object({
  text: z.string(),
  duration_ms: z.number().int().nonnegative(),
  audio_path: z.string().nullable(),
});
export type TranscribeResponse = z.infer<typeof TranscribeResponseSchema>;

/* ── POST /api/checkin ──────────────────────────────────────────────── */

export const CheckinRequestSchema = z.object({
  /** The user's own words. Required either way — voice arrives already transcribed. */
  text: z.string().min(1).max(8000),
  input_mode: z.enum(INPUT_MODES),
  audio_path: z.string().nullable().default(null),
  audio_duration_ms: z.number().int().nonnegative().nullable().default(null),
  transcript_failed: z.boolean().default(false),
  /** Computed client-side from the device clock. Server validates against the profile tz. */
  local_date: zLocalDate,
});
export type CheckinRequest = z.infer<typeof CheckinRequestSchema>;

/** What the one vertical path returns. This is the screen after you hit send. */
export const CheckinResponseSchema = z.object({
  entry_id: zUuid,
  /** Your mood face for the calendar. Yours only. */
  mood_face: z.number().int().min(1).max(5),

  reply: z.object({
    acknowledgement: z.string(),
    for_you: z.string(),
    /** Null means nothing was carried today. The UI must not imply something is missing. */
    partner_item: z.string().nullable(),
    nudge_id: zUuid.nullable(),
  }),

  pet: PetStateSchema,

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
  pet: PetStateSchema,
  today_nudge: NudgeViewSchema.nullable(),
  display_name: z.string(),
  partner_display_name: z.string(),
});
export type TodayResponse = z.infer<typeof TodayResponseSchema>;

/* ── GET /api/drawers ───────────────────────────────────────────────── */
export const DrawersResponseSchema = z.object({
  things_to_work_on: z.array(NudgeViewSchema),
  kind_words: z.array(KindWordViewSchema),
});
export type DrawersResponse = z.infer<typeof DrawersResponseSchema>;

/* ── POST /api/nudges/[id]/acted ────────────────────────────────────── */
export const ActedRequestSchema = z.object({
  note: z.string().max(2000).default(''),
});
export type ActedRequest = z.infer<typeof ActedRequestSchema>;

/** The reciprocity beat: what your partner quietly logged while you were struggling. */
export const ActedResponseSchema = z.object({
  reveal: z.array(KindWordViewSchema),
  /** True when there is genuinely nothing logged. The UI says so plainly, invents nothing. */
  nothing_logged: z.boolean(),
});
export type ActedResponse = z.infer<typeof ActedResponseSchema>;

/* ── GET /api/calendar?month=YYYY-MM ────────────────────────────────── */
export const CalendarResponseSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  days: z.array(z.object({ local_date: zLocalDate, mood_face: z.number().int().min(1).max(5) })),
});
export type CalendarResponse = z.infer<typeof CalendarResponseSchema>;

/* ── pairing + demo ─────────────────────────────────────────────────── */
export const JoinRequestSchema = z.object({ invite_code: z.string().length(6) });
export type JoinRequest = z.infer<typeof JoinRequestSchema>;

export const DemoLoginRequestSchema = z.object({ role: z.enum(['avery', 'sam']) });
export type DemoLoginRequest = z.infer<typeof DemoLoginRequestSchema>;
