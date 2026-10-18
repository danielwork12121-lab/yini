/**
 * Create an account from a username and password.
 *
 * Uses the admin API with the address pre-confirmed, so sign-up needs no email
 * round trip and works no matter how the project's email confirmation is set.
 * The browser then signs in normally, which is what sets the session cookies.
 */
import { NextResponse } from 'next/server';
import { fail } from '@/lib/http/action-route';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { env } from '@/lib/env';
import { checkCredentials, normalizeUsername, usernameToEmail } from '@/lib/auth/username';

export async function POST(request: Request) {
  if (!env.isSupabaseConfigured()) return fail('server_error', 'Sign-up is not configured yet.', 500, false);

  const body = (await request.json().catch(() => null)) as { username?: unknown; password?: unknown } | null;
  const username = typeof body?.username === 'string' ? body.username : '';
  const password = typeof body?.password === 'string' ? body.password : '';

  const problem = checkCredentials(username, password);
  if (problem) return fail('invalid_input', problem, 400);

  const name = normalizeUsername(username);
  const { error } = await createAdminSupabase().auth.admin.createUser({
    email: usernameToEmail(name),
    password,
    email_confirm: true,
    user_metadata: { display_name: name, username: name },
  });

  if (error) {
    const taken = /already|exists|registered/i.test(error.message);
    return taken
      ? fail('conflict', 'That username is taken. Try another one.', 409)
      : fail('server_error', 'Could not create your account. Try again.', 500);
  }
  return NextResponse.json({ ok: true });
}
