'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * The landing screen. A judge scans a QR and has to be inside the app in about
 * five seconds, looking at a connection with real history — not a signup form
 * and not an empty state.
 */
export default function Home() {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const demo = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

  async function enter(role: 'avery' | 'sam') {
    setBusy(role); setError(null);
    const res = await fetch('/api/demo/login', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? 'Could not sign in.'); setBusy(null); return;
    }
    router.push('/today'); router.refresh();
  }

  return (
    <main className="phone" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <p className="display" style={{ fontSize: 44, margin: '0 0 6px' }}>Corner</p>
      <p className="body" style={{ color: 'var(--ink-muted)', marginTop: 0, maxWidth: '32ch' }}>
        Two private journals. One quiet thing a day worth doing. Neither of you ever reads the other.
      </p>

      {demo ? (
        <div style={{ marginTop: 28 }}>
          <p className="caption" style={{ textTransform: 'uppercase', letterSpacing: '.06em' }}>Try it as</p>
          <button className="btn" disabled={!!busy} onClick={() => enter('avery')}>
            {busy === 'avery' ? 'One moment…' : "I'm Avery"}
          </button>
          <div style={{ height: 10 }} />
          <button className="btn btn-quiet" disabled={!!busy} onClick={() => enter('sam')}>
            {busy === 'sam' ? 'One moment…' : "I'm Sam"}
          </button>
          <p className="caption" style={{ marginTop: 14 }}>
            Two seeded accounts sharing one connection. Open the other in a second tab to watch both sides at once.
          </p>
        </div>
      ) : (
        <p className="small" style={{ marginTop: 28 }}>Sign-in is not wired up yet.</p>
      )}

      {error && <p className="small" style={{ color: '#9E4A33' }}>{error}</p>}
    </main>
  );
}
