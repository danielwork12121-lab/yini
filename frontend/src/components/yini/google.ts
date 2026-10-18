'use client';
import { createClient } from '@/lib/supabase/client';

/**
 * Starts Google sign-in. Supabase redirects to Google, Google back to Supabase,
 * and Supabase back to /auth/callback, which turns the code into a session.
 * Returns an error message, or null when the browser is navigating away.
 */
export async function signInWithGoogle(next = '/pair'): Promise<string | null> {
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  return error ? error.message : null;
}
