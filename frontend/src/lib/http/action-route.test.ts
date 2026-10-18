import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { defineAction } from '@/ontology';
import { actionRoute, ActionError } from './action-route';

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabase: async () => ({ auth: { getUser: async () => ({ data: { user: null } }) } }),
}));

const echo = (actor: 'admin' | 'cron' | 'public' | 'user', inputFrom: 'json' | 'query' = 'json') => defineAction({
  apiName: 'echo', title: 'Echo', description: '', actor, route: { method: 'POST', path: '/api/echo' },
  input: z.object({ n: z.coerce.number().int().min(1) }), inputFrom,
  output: z.object({ doubled: z.number() }), writes: [], reads: [],
});

const post = (body: unknown, headers: Record<string, string> = {}) =>
  new NextRequest('http://test/api/echo', { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json', ...headers } });

afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe('actionRoute', () => {
  it('parses input and validates output', async () => {
    const res = await actionRoute(echo('public'), async ({ input }) => ({ doubled: input.n * 2 }))(post({ n: 4 }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ doubled: 8 });
  });

  it('reads query input for GET-style actions', async () => {
    const req = new NextRequest('http://test/api/echo?n=3');
    const res = await actionRoute(echo('public', 'query'), async ({ input }) => ({ doubled: input.n * 2 }))(req);
    expect(await res.json()).toEqual({ doubled: 6 });
  });

  it('rejects bad input with the error envelope', async () => {
    const res = await actionRoute(echo('public'), async () => ({ doubled: 0 }))(post({ n: 0 }));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ code: 'invalid_input', recoverable: true });
  });

  it('refuses output that does not match the ontology', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await actionRoute(echo('public'), async () => ({ doubled: 'two' } as never))(post({ n: 1 }));
    expect(res.status).toBe(500);
  });

  it('maps ActionError to its status and code', async () => {
    const res = await actionRoute(echo('public'), async () => { throw new ActionError('conflict', 'nope', 409, false); })(post({ n: 1 }));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: 'nope', code: 'conflict', recoverable: false });
  });

  it('requires a session for user actions', async () => {
    const res = await actionRoute(echo('user'), async () => ({ doubled: 0 }))(post({ n: 1 }));
    expect(res.status).toBe(401);
  });

  it('requires the admin token, and refuses everyone when none is configured', async () => {
    const route = actionRoute(echo('admin'), async ({ input }) => ({ doubled: input.n * 2 }));
    expect((await route(post({ n: 1 }, { 'x-admin-token': 'anything' }))).status).toBe(403);
    vi.stubEnv('ADMIN_TOKEN', 'secret-admin-token');
    expect((await route(post({ n: 1 }, { 'x-admin-token': 'wrong' }))).status).toBe(403);
    expect((await route(post({ n: 1 }, { 'x-admin-token': 'secret-admin-token' }))).status).toBe(200);
  });

  it('requires the cron bearer secret', async () => {
    const route = actionRoute(echo('cron'), async () => ({ doubled: 0 }));
    vi.stubEnv('CRON_SECRET', 'cron-secret');
    expect((await route(post({ n: 1 }))).status).toBe(403);
    expect((await route(post({ n: 1 }, { authorization: 'Bearer cron-secret' }))).status).toBe(200);
  });
});
