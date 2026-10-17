'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SignInButtons } from '@/components/SignInButtons';

export default function Home() {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const demo = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

  async function enterDemo(role: 'avery' | 'sam') {
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

      <div style={{ marginTop: 28 }}>
        <SignInButtons next="/pair" />
      </div>

      {demo && (
        <div style={{ marginTop: 30, paddingTop: 22, borderTop: '1px solid var(--line)' }}>
          <p className="caption" style={{ textTransform: 'uppercase', letterSpacing: '.06em', marginTop: 0 }}>
            Or try the demo
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-quiet" disabled={!!busy} onClick={() => enterDemo('avery')}>
              {busy === 'avery' ? '…' : "I'm Avery"}
            </button>
            <button className="btn btn-quiet" disabled={!!busy} onClick={() => enterDemo('sam')}>
              {busy === 'sam' ? '…' : "I'm Sam"}
            </button>
          </div>
          <p className="caption" style={{ marginTop: 12 }}>
            Two seeded accounts sharing one connection. Open the second in a private window.
          </p>
        </div>
      )}

      {error && <p className="small" style={{ color: '#9E4A33' }}>{error}</p>}
    </main>
  );
}
