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
