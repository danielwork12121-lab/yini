/**
 * Two kinds of little step in Grow.
 *
 *   do      something to do for your person or for the two of you
 *   notice  something to look back on and take note of: a small act of attention
 *
 * Yini writes both kinds each night, and pairs them: when one person is nudged to do
 * something kind for the other, the other is nudged to notice kindness, in plain words
 * that say nothing about what the first one was asked. So a small act gets seen without
 * anyone having to point at it.
 *
 * The kind rides in the bullet's own text (a `[notice] ` prefix) so nothing in the
 * database changes: a bullet with no prefix, which is every older one, is a "do".
 */
export type QuestKind = 'do' | 'notice';
export const NOTICE_PREFIX = '[notice] ';

const MARK = /^\s*[[(]?\s*notice\s*[\])]?\s*[:\-–—]?\s*/i;

export function questOf(raw: string): { kind: QuestKind; text: string } {
  if (raw.trimStart().toLowerCase().startsWith('[notice]') || /^\s*notice\s*:/i.test(raw)) {
    return { kind: 'notice', text: raw.replace(MARK, '').trim() || raw.trim() };
  }
  return { kind: 'do', text: raw.trim() };
}

/** Whatever form the model used, store notice quests with the one canonical prefix. */
export function normalizeQuest(raw: string): string {
  const q = questOf(raw);
  return q.kind === 'notice' ? `${NOTICE_PREFIX}${q.text}` : q.text;
}

/**
 * How many quests a night's Grow deserves, from how much the person said. A few words
 * is one small quest; a long, full entry earns up to five. Nothing written still gets one.
 */
export function questBudget(entryText: string | null | undefined): number {
  const words = (entryText ?? '').trim().split(/\s+/).filter(Boolean).length;
  if (words < 25) return 1;
  if (words < 60) return 2;
  if (words < 130) return 3;
  if (words < 260) return 4;
  return 5;
}

/**
 * Cut a night's quests down to the budget, keeping their order. When there is room for
 * more than one, a notice quest that would be cut is swapped in for the last one, so the
 * pair (a thing to do, a thing to notice) survives a short night.
 */
export function fitQuests(bullets: readonly string[], budget: number): string[] {
  const n = Math.max(1, budget);
  if (bullets.length <= n) return [...bullets];
  const kept = bullets.slice(0, n);
  if (n >= 2 && !kept.some((b) => questOf(b).kind === 'notice')) {
    const notice = bullets.find((b) => questOf(b).kind === 'notice');
    if (notice) kept[n - 1] = notice;
  }
  return kept;
}
