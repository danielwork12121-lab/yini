import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { geminiFetch, keyIsTheProblem, keyOrder, resetCooldowns } from './geminiFetch';

const ok = () => new Response('{}', { status: 200 });
const quota = () => new Response('{"error":{"status":"RESOURCE_EXHAUSTED"}}', { status: 429 });

describe('geminiFetch', () => {
  beforeEach(() => {
    resetCooldowns();
    vi.stubEnv('GEMINI_API_KEY', 'main'); vi.stubEnv('GEMINI_API_KEY_BACKUP', 'spare');
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

  const sent = (spy: ReturnType<typeof vi.fn>) => spy.mock.calls.map((c) => (c[1] as RequestInit & { headers: Record<string, string> }).headers['x-goog-api-key']);

  it('uses the main key when it works', async () => {
    const f = vi.fn().mockResolvedValue(ok()); vi.stubGlobal('fetch', f);
    expect((await geminiFetch('m', {})).ok).toBe(true);
    expect(sent(f)).toEqual(['main']);
  });

  it('moves to the spare key when the main one is out of quota, then leaves the dry key alone for a while', async () => {
    const f = vi.fn().mockResolvedValueOnce(quota()).mockResolvedValue(ok()); vi.stubGlobal('fetch', f);
    expect((await geminiFetch('m', {})).ok).toBe(true);
    expect(sent(f)).toEqual(['main', 'spare']);
    await geminiFetch('m', {});
    expect(sent(f)).toEqual(['main', 'spare', 'spare']);
  });

  it('returns the last failure when every key is refused', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => quota()));
    expect((await geminiFetch('m', {})).status).toBe(429);
  });

  it('does not retry a bad request, which another key would not fix', async () => {
    const f = vi.fn().mockResolvedValue(new Response('bad schema', { status: 400 })); vi.stubGlobal('fetch', f);
    expect((await geminiFetch('m', {})).status).toBe(400);
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('works with only the spare set', async () => {
    vi.stubEnv('GEMINI_API_KEY', '');
    const f = vi.fn().mockResolvedValue(ok()); vi.stubGlobal('fetch', f);
    await geminiFetch('m', {});
    expect(sent(f)).toEqual(['spare']);
  });

  it('classifies refusals', () => {
    expect(keyIsTheProblem(429, '')).toBe(true);
    expect(keyIsTheProblem(403, '')).toBe(true);
    expect(keyIsTheProblem(400, 'API key not valid')).toBe(true);
    expect(keyIsTheProblem(400, 'bad json')).toBe(false);
    expect(keyIsTheProblem(500, '')).toBe(false);
    expect(keyOrder(['a', 'b'])).toEqual(['a', 'b']);
  });
});
