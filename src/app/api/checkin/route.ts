import { NextResponse } from 'next/server';
// Node runtime is the project default here; a route-segment `runtime` export is
// incompatible with this Next version's cacheComponents setting.
import { CheckinRequestSchema, type ApiError } from '@/contract';
import { createServerSupabase } from '@/lib/supabase/server';
import { CheckinError, runCheckin } from '@/lib/checkin';

export const maxDuration = 60;

const fail = (code: ApiError['code'], error: string, status: number, recoverable = true) =>
  NextResponse.json({ error, code, recoverable } satisfies ApiError, { status });

export async function POST(request: Request) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail('unauthenticated', 'Sign in first', 401, false);

  const parsed = CheckinRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail('invalid_input', parsed.error.issues[0]?.message ?? 'Bad request', 400);

  try {
    return NextResponse.json(await runCheckin(supabase, user.id, parsed.data));
  } catch (e) {
    if (e instanceof CheckinError) return fail(e.code as ApiError['code'], e.message, 400, e.recoverable);
    console.error('[checkin]', e);
    return fail('server_error', 'Something broke on our side. Your entry was saved.', 500);
  }
}
