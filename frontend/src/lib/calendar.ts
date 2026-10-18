/**
 * The calendar's one row per day lives in `mood_days` (readable only by its author).
 * Its `note` column holds the day's jot notes as a small JSON document, so the
 * emoji, the one-line headline and the list of short notes travel together
 * without a schema change. Older rows hold plain text; they decode to a headline.
 */
export const FACE_EMOJI = ['😶', '😞', '😕', '😐', '🙂', '😄'] as const;
export const MAX_JOTS = 12;
export const MAX_JOT_LENGTH = 120;

export type DayNote = { emoji: string; headline: string; jots: string[] };

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

/** Short, deduplicated, bounded. */
export function normalizeJots(jots: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of jots) {
    const j = clean(raw.replace(/^[\s•\-*–—·]+/, ''));
    const key = j.toLowerCase();
    if (!j || seen.has(key)) continue;
    seen.add(key);
    out.push(j);
    if (out.length >= MAX_JOTS) break;
  }
  return out;
}

export function encodeDayNote(n: DayNote): string {
  return JSON.stringify({ v: 1, e: n.emoji, h: n.headline, j: n.jots });
}

export function decodeDayNote(raw: string | null | undefined, face: number): DayNote {
  const fallback: DayNote = { emoji: faceEmoji(face), headline: '', jots: [] };
  if (!raw) return fallback;
  try {
    const o = JSON.parse(raw) as { v?: number; e?: unknown; h?: unknown; j?: unknown };
    if (o && o.v === 1) {
      return {
        emoji: isSingleEmoji(typeof o.e === 'string' ? o.e : null) ? (o.e as string).trim() : fallback.emoji,
        headline: typeof o.h === 'string' ? o.h.slice(0, 200) : '',
        jots: Array.isArray(o.j) ? normalizeJots(o.j.filter((x): x is string => typeof x === 'string')) : [],
      };
    }
  } catch { /* plain text from before jot notes existed */ }
  return { ...fallback, headline: raw.slice(0, 200) };
}

/**
 * A second check-in the same day adds to the day instead of replacing it:
 * its jots follow the earlier ones, and its headline and emoji describe the day so far.
 */
export function mergeDayNotes(previous: DayNote | null, next: DayNote): DayNote {
  return {
    emoji: next.emoji,
    headline: next.headline || previous?.headline || '',
    jots: normalizeJots([...(previous?.jots ?? []), ...next.jots]),
  };
}

/** One line for the entry's own memory (`entries.ai_summary`), so the joint AI can read it right away. */
export function noteAsSummary(n: DayNote, limit = 600): string {
  const text = [n.headline, ...n.jots].filter(Boolean).join(' · ');
  return text.length <= limit ? text : text.slice(0, limit - 1) + '…';
}
