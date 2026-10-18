import type { Metadata } from 'next';
import { env } from '@/lib/env';
import { GlowView } from '@/components/GlowView';
import { SetupNeeded } from '@/components/SetupNeeded';

export const metadata: Metadata = { title: 'Glow · Yini' };

/**
 * No sign-in check here on purpose: the page itself is the same for everyone and loads
 * at once, and the API behind it is what knows who you are (it answers 401, and the view
 * sends you back to sign in). One less round trip on every visit.
 */
export default function GlowPage() {
  if (!env.isSupabaseConfigured()) return <SetupNeeded />;
  return (
    <main className="phone" style={{ paddingTop: 28 }}>
      <GlowView />
    </main>
  );
}
