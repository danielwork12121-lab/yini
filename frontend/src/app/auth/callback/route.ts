import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

/**
 * OAuth lands here with a `code`. Exchanging it is what writes the session
 * cookies; until that happens the user is not signed in no matter what the
 * provider said.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/today';

  if (!code) return NextResponse.redirect(new URL('/auth/auth-code-error', url.origin));

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error('[auth/callback]', error.message);
    return NextResponse.redirect(new URL('/auth/auth-code-error', url.origin));
  }

  // Behind a proxy (Vercel), url.origin is the internal host, not the one the
  // user is actually on — redirecting there drops them on the wrong domain.
  const forwardedHost = request.headers.get('x-forwarded-host');
  const proto = request.headers.get('x-forwarded-proto') ?? 'https';
  const base = forwardedHost ? `${proto}://${forwardedHost}` : url.origin;

  return NextResponse.redirect(`${base}${next}`);
}
