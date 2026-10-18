/**
 * Every Gemini call goes through here, so a spare key can take over without anyone redeploying.
 *
 * GEMINI_API_KEY is tried first. When Google refuses it for a reason a different key could fix
 * (out of quota, key disabled or leaked), the same request is sent again with GEMINI_API_KEY_BACKUP.
 * Put the backup in a different Google project: the free quota belongs to the project, not the key.
 */
import { env } from '@/lib/env';

/** How long a key that just ran dry is left alone, so every call does not pay for a failed attempt first. */
export const COOLDOWN_MS = 60_000;
const coolingUntil = new Map<string, number>();

/** True when another key could succeed where this response failed. A bad request or a 5xx would fail the same way. */
export function keyIsTheProblem(status: number, body: string): boolean {
  if (status === 429 || status === 401 || status === 403) return true;
  return status === 400 && /API key|API_KEY/i.test(body);
}

/** Keys in the order to try them: ones not cooling down first, the rest after as a last resort. */
export function keyOrder(keys: string[], now = Date.now()): string[] {
  const ready = keys.filter((k) => (coolingUntil.get(k) ?? 0) <= now);
  return [...ready, ...keys.filter((k) => !ready.includes(k))];
}

export function resetCooldowns() { coolingUntil.clear(); }

/** POST a generateContent request. Returns the last response, so callers keep their own error handling. */
export async function geminiFetch(model: string, body: unknown): Promise<Response> {
  const keys = keyOrder(env.geminiKeys());
  if (!keys.length) throw new Error('GEMINI_API_KEY not set');
  const payload = JSON.stringify(body);
  let res!: Response;
  for (let i = 0; i < keys.length; i++) {
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': keys[i] },
      body: payload,
    });
    if (res.ok || i === keys.length - 1) return res;
    const text = await res.clone().text().catch(() => '');
    if (!keyIsTheProblem(res.status, text)) return res;
    coolingUntil.set(keys[i], Date.now() + COOLDOWN_MS);
    console.error(`[gemini] key ${i + 1} of ${keys.length} refused (${res.status}); trying the next one`);
  }
  return res;
}
