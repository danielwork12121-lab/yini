'use client';

/**
 * A tiny read-through cache for the app's own GET endpoints. A page shows the last
 * answer straight away and refreshes it behind the scenes, so going back to Grow or
 * Glow never starts from a blank "Loading…". Held in memory and in sessionStorage
 * (this tab only), and cleared on sign-out.
 */
export class HttpError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

const mem = new Map<string, unknown>();
const KEY = (url: string) => `yini.cache:${url}`;

export function peekJson<T>(url: string): T | null {
  if (mem.has(url)) return mem.get(url) as T;
  try {
    const raw = sessionStorage.getItem(KEY(url));
    if (raw) { const v = JSON.parse(raw) as T; mem.set(url, v); return v; }
  } catch { /* storage can be blocked; the cache is only a speed-up */ }
  return null;
}

export function putJson<T>(url: string, value: T): void {
  mem.set(url, value);
  try { sessionStorage.setItem(KEY(url), JSON.stringify(value)); } catch { /* ignore */ }
}

/** Fetches fresh, remembers it, and throws the server's own reason when it fails. */
export async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    const why = ((await res.json().catch(() => null)) as { error?: string } | null)?.error;
    throw new HttpError(why ?? '', res.status);
  }
  const body = (await res.json()) as T;
  putJson(url, body);
  return body;
}

/** Quietly warm the cache, e.g. from Home, so the next page opens already filled. */
export function warmJson(url: string): void {
  void fetchJson(url).catch(() => undefined);
}

export function clearJsonCache(): void {
  mem.clear();
  try {
    for (const k of Object.keys(sessionStorage)) if (k.startsWith('yini.cache:')) sessionStorage.removeItem(k);
  } catch { /* ignore */ }
}
