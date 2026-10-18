/**
 * Turns an ontology ActionType into a Next route handler.
 *
 *   export const POST = actionRoute(actionTypes.checkIn, async ({ input, user }) => ...);
 *
 * The wrapper owns everything that should be identical across routes: who may call
 * (from `action.actor`), parsing the input against `action.input`, checking the
 * result against `action.output`, and the one error envelope. Handlers receive
 * typed, validated input and return a plain object.
 */
import 'server-only';
import { timingSafeEqual } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { z } from 'zod';
import type { ApiError } from '@/contract';
import type { ActionType } from '@/ontology';
import { createServerSupabase } from '@/lib/supabase/server';
import { env } from '@/lib/env';

export class ActionError extends Error {
  constructor(
    readonly code: ApiError['code'],
    message: string,
    readonly status = 400,
    readonly recoverable = true,
  ) { super(message); }
}

export function fail(code: ApiError['code'], error: string, status: number, recoverable = true) {
  return NextResponse.json({ error, code, recoverable } satisfies ApiError, { status });
}

interface BaseCtx<I> { input: I; request: NextRequest }
export interface UserCtx<I> extends BaseCtx<I> { user: User; supabase: SupabaseClient }
export type Ctx<A extends ActionType, I> = A extends { actor: 'user' } ? UserCtx<I> : BaseCtx<I>;

const secretMatches = (given: string | null, expected: string | null) => {
  if (!given || !expected) return false;
  const a = Buffer.from(given), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
};

async function readInput(action: ActionType, request: NextRequest): Promise<unknown> {
  switch (action.inputFrom) {
    case 'json': return (await request.json().catch(() => null)) ?? {};
    case 'query': return Object.fromEntries(request.nextUrl.searchParams);
    case 'multipart': {
      const form = await request.formData().catch(() => null);
      return form ? Object.fromEntries(form) : {};
    }
    case 'none': return {};
  }
}

export function actionRoute<A extends ActionType>(
  action: A,
  handler: (ctx: Ctx<A, z.output<A['input']>>) => Promise<z.input<A['output']>>,
) {
  return async (request: NextRequest): Promise<Response> => {
    try {
      let auth: { user: User; supabase: SupabaseClient } | null = null;
      switch (action.actor) {
        case 'user': {
          const supabase = await createServerSupabase();
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return fail('unauthenticated', 'Sign in first', 401, false);
          auth = { user, supabase };
          break;
        }
        case 'admin':
          if (!secretMatches(request.headers.get('x-admin-token'), env.adminToken())) {
            return fail('forbidden', 'Admin token required', 403, false);
          }
          break;
        case 'cron':
          if (!secretMatches(request.headers.get('authorization'), env.cronSecret() && `Bearer ${env.cronSecret()}`)) {
            return fail('forbidden', 'Cron secret required', 403, false);
          }
          break;
        case 'public':
          break;
      }

      const parsed = action.input.safeParse(await readInput(action, request));
      if (!parsed.success) {
        const issue = parsed.error.issues[0];
        return fail('invalid_input', issue ? `${issue.message}${issue.path.length ? ` (${issue.path.join('.')})` : ''}` : 'Bad request', 400);
      }

      const out = await handler({ input: parsed.data, request, ...auth } as Ctx<A, z.output<A['input']>>);

      const checked = action.output.safeParse(out);
      if (!checked.success) {
        // The response does not match the ontology. In dev and tests that is a bug
        // to fix now; in production, log it and still answer the user.
        console.error(`[${action.apiName}] output does not match ontology`, checked.error.issues);
        if (process.env.NODE_ENV !== 'production') {
          return fail('server_error', `Output of ${action.apiName} does not match its schema`, 500);
        }
        return NextResponse.json(out);
      }
      return NextResponse.json(checked.data);
    } catch (e) {
      if (e instanceof ActionError) return fail(e.code, e.message, e.status, e.recoverable);
      console.error(`[${action.apiName}]`, e);
      return fail('server_error', 'Something broke on our side.', 500);
    }
  };
}
