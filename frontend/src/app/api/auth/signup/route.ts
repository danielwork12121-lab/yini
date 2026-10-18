/**
 * Create an account from a name, an email and a password.
 *
 * Uses the admin API with the address pre-confirmed, so sign-up needs no email
 * round trip and works no matter how the project's email confirmation is set.
 * The browser then signs in normally, which is what sets the session cookies.
 */
import { NextResponse } from 'next/server';
import { fail } from '@/lib/http/action-route';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { env } from '@/lib/env';
import { checkSignup, normalizeEmail } from '@/lib/auth/username';

export async function POST(request: Request) {
  if (!env.isSupabaseConfigured()) return fail('server_error', 'Sign-up is not configured yet.', 500, false);

  const body = (await request.json().catch(() => null)) as { name?: unknown; email?: unknown; password?: unknown } | null;
  const rawName = typeof body?.name === 'string' ? body.name : '';
  const rawEmail = typeof body?.email === 'string' ? body.email : '';
  const password = typeof body?.password === 'string' ? body.password : '';

  const problem = checkSignup(rawName, rawEmail, password);
  if (problem) return fail('invalid_input', problem, 400);

  const name = rawName.trim();
  const { error } = await createAdminSupabase().auth.admin.createUser({
    email: normalizeEmail(rawEmail),
    password,
    email_confirm: true,
    user_metadata: { display_name: name },
  });

  if (error) {
    const taken = /already|exists|registered/i.test(error.message);
    return taken
      ? fail('conflict', 'That email already has an account. Try signing in.', 409)
      : fail('server_error', 'Could not create your account. Try again.', 500);
  }
  return NextResponse.json({ ok: true });
}
