/**
 * Yini — database row shapes.
 *
 * The definitions moved to `src/ontology/objects/`, one file per object type, each
 * with field-level docs. This file re-exports them so `@/contract` stays the single
 * import for both halves of the app.
 *
 * ── THE RULE THAT SHAPES EVERYTHING ──────────────────────────────────────────
 * `JournalEntry.raw_text` is the user's own words. Readable by exactly one person
 * (its author). It reaches a model in two places only: the classifier inside the
 * author's own check-in, and the nightly agent, which no user triggers and whose
 * output is leak-checked twice before either person sees it.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export {
  ProfileSchema, type Profile,
  ConnectionSchema, type Connection,
  ConnectionMemberSchema, type ConnectionMember,
  ConnectionPeerSchema, type ConnectionPeer,
  JournalEntrySchema, type JournalEntry,
  ConcernSchema, type Concern,
  NudgeSchema, type Nudge,
  NudgeMessageSchema, type NudgeMessage,
  KindWordSchema, type KindWord,
  CareActSchema, type CareAct,
  QuestSchema, type Quest,
  PetSchema, type Pet,
  PetStateSchema, type PetState,
  PetFeedingSchema, type PetFeeding,
  MoodDaySchema, type MoodDay,
  SafetyEventSchema, type SafetyEvent,
  AnalysisRunSchema, type AnalysisRun,
  DailyFeedbackSchema, type DailyFeedback,
} from '../ontology/objects';
