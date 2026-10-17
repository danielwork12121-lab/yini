'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

/**
 * OAuth sign-in. The provider redirects to Supabase, which redirects back to
 * /auth/callback, which exchanges the code for a session.
 *
 * Buttons are text-only on purpose: Google and Apple both require their own
 * official brand assets with specific clear-space and sizing rules, and a
 * hand-drawn approximation of either mark is a trademark problem. Drop the real
 * assets in from their brand pages when you want the marks.
 */
export function SignInButtons({ next = '/today' }: { next?: string }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const appleEnabled = process.env.NEXT_PUBLIC_APPLE_SIGNIN === 'true';

  async function signIn(provider: 'google' | 'apple') {
    setBusy(provider);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (error) { setError(error.message); setBusy(null); }
    // On success the browser navigates away; no cleanup needed.
  }

  return (
    <div>
      <button className="btn" disabled={!!busy} onClick={() => signIn('google')}>
        {busy === 'google' ? 'Opening Google…' : 'Continue with Google'}
      </button>

      {appleEnabled && (
        <>
          <div style={{ height: 10 }} />
          <button className="btn btn-quiet" disabled={!!busy} onClick={() => signIn('apple')}>
            {busy === 'apple' ? 'Opening Apple…' : 'Continue with Apple'}
          </button>
        </>
      )}

      {error && <p className="small" style={{ color: '#9E4A33', marginTop: 10 }}>{error}</p>}
    </div>
  );
}
