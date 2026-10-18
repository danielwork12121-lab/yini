/**
 * The calendar's one row per day lives in `mood_days` (readable only by its author).
 * Its `note` column holds the day's jot notes as a small JSON document, so the
 * emoji, the one-line headline and the list of short notes travel together
 * without a schema change. Older rows hold plain text; they decode to a headline.
 */
export const FACE_EMOJI = ['😶', '😞', '😕', '😐', '🙂', '😄'] as const;
export const MAX_JOTS = 12;
/** The most key points a single day ever shows, so a talkative day never overflows the sheet. */
export const MAX_DAY_JOTS = 6;
export const MAX_JOT_LENGTH = 120;

export type DayNote = { emoji: string; headline: string; jots: string[]; /** Set to 'you' when the person changed the face themselves. */ by?: 'you' };

/**
 * The three faces a day can have on the calendar, and how a day is sorted into one:
 *   happy    (yellow)  relatively positive: good, fine, calm, content, warm, productive
 *   neutral  (green)   in between: ordinary, flat, mixed, or a small low (tired, missing someone, a little hurt, mild stress)
 *   sad      (grey)    a genuinely hard day: real sadness, crying, a fight, overwhelmed, anxiety or anger that took over
 * Sad has to be earned. A passing feeling is neutral.
 */
export type DayMood = 'happy' | 'neutral' | 'sad';
/** The one emoji each mood is stored as (the day summary writes exactly one of these). */
export const DAY_MOOD_EMOJI: Record<DayMood, string> = { happy: '🙂', neutral: '😐', sad: '😔' };
/** The mood face (1 to 5) a chosen mood is recorded with, for anything else that reads it. */
export const DAY_MOOD_FACE: Record<DayMood, number> = { happy: 4, neutral: 3, sad: 2 };
const SAD = ['😔', '😞', '😢', '😭', '🥺', '😕', '😿', '💔', '🙁', '☹', '🌧', '☔', '😣', '😖', '😫', '😩', '😰', '😨', '😤', '😡', '🤯', '😵', '😬', '😮‍💨', '😓', '😟', '🥵', '⚡', '😠', '😒'];
const NEUTRAL = ['😐', '😶', '😑', '🫤', '🙃', '😴'];
const HAPPY = /[🙂😊😄😁😀🥰😍🎉✨☀🌞😌🤗]/u;

/** Which of the three faces a day gets. A recognised emoji decides; otherwise the 1 to 5 face does. */
export function moodOfDay(emoji: string | null | undefined, face: number): DayMood {
  const e = emoji ?? '';
  if (SAD.some((x) => e.includes(x))) return 'sad';
  if (NEUTRAL.some((x) => e.includes(x))) return 'neutral';
  if (e && HAPPY.test(e)) return 'happy';
  return face <= 2 ? 'sad' : face >= 4 ? 'happy' : 'neutral';
}

export const faceEmoji = (face: number) => FACE_EMOJI[Math.min(5, Math.max(1, Math.round(face)))] ?? FACE_EMOJI[3];

/** Exactly one pictograph (with its joiners and selectors), nothing else. */
export function isSingleEmoji(s: string | null | undefined): s is string {
  if (!s) return false;
  const text = s.trim();
  if (!/[\p{Extended_Pictographic}\p{Regional_Indicator}]/u.test(text) || text.length > 16) return false;
  const segs = [...new Intl.Segmenter('en', { granularity: 'grapheme' }).segment(text)];
  return segs.length === 1;
}

const clean = (s: string) => s.replace(/\s+/g, ' ').trim().slice(0, MAX_JOT_LENGTH);

export const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

/**
 * How many key points a day deserves, from how much was said across all of it.
 * A few words: keep the ideas as they are. A long ramble: condense hard. Never more
 * than MAX_DAY_JOTS.
 */
export function jotBudget(words: number): number {
  if (words < 6) return 0;
  if (words <= 20) return 1;
  if (words <= 45) return 2;
  if (words <= 90) return 3;
  if (words <= 160) return 4;
  if (words <= 300) return 5;
  return MAX_DAY_JOTS;
}

/** Short, deduplicated, bounded. */
export function normalizeJots(jots: readonly string[], max = MAX_JOTS): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of jots) {
    if (out.length >= max) break;
    const j = clean(raw.replace(/^[\s•\-*–—·]+/, ''));
    const key = j.toLowerCase();
    if (!j || seen.has(key)) continue;
    seen.add(key);
    out.push(j);
  }
  return out;
}

export function encodeDayNote(n: DayNote): string {
  return JSON.stringify(n.by === 'you' ? { v: 1, e: n.emoji, h: n.headline, j: n.jots, u: 1 } : { v: 1, e: n.emoji, h: n.headline, j: n.jots });
}

export function decodeDayNote(raw: string | null | undefined, face: number): DayNote {
  const fallback: DayNote = { emoji: faceEmoji(face), headline: '', jots: [] };
  if (!raw) return fallback;
  try {
    const o = JSON.parse(raw) as { v?: number; e?: unknown; h?: unknown; j?: unknown; u?: unknown };
    if (o && o.v === 1) {
      return {
        emoji: isSingleEmoji(typeof o.e === 'string' ? o.e : null) ? (o.e as string).trim() : fallback.emoji,
        headline: typeof o.h === 'string' ? o.h.slice(0, 200) : '',
        jots: Array.isArray(o.j) ? normalizeJots(o.j.filter((x): x is string => typeof x === 'string')) : [],
        ...(o.u === 1 ? { by: 'you' as const } : {}),
      };
    }
  } catch { /* plain text from before jot notes existed */ }
  return { ...fallback, headline: raw.slice(0, 200) };
}

/** One line for the entry's own memory (`entries.ai_summary`), so the joint AI can read it right away. */
export function noteAsSummary(n: DayNote, limit = 600): string {
  const text = [n.headline, ...n.jots].filter(Boolean).join(' · ');
  return text.length <= limit ? text : text.slice(0, limit - 1) + '…';
}

/** "morning, 9:12 AM": when in their day something was said, so a whole-day summary can see how the day moved. */
export function timeLabel(iso: string, timezone: string): string {
  const at = new Date(iso);
  const hour = Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone: timezone }).format(at));
  const part = hour < 5 ? 'late night' : hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : hour < 21 ? 'evening' : 'night';
  const clock = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: timezone }).format(at);
  return `${part}, ${clock}`;
}
