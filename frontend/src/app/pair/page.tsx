'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Where a freshly signed-in user lands. One account can hold many sealed
 * connections; the hackathon UI pairs exactly one.
 */
export default function PairPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [invite, setInvite] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { void refresh(); }, []);

  async function refresh() {
    const res = await fetch('/api/connection');
    if (res.status === 401) { router.push('/'); return; }
    const j = await res.json();
    if (j.paired) { router.push('/today'); return; }
    if (j.display_name) setName(j.display_name);
    if (j.invite_code) setInvite(j.invite_code);
    setLoading(false);
  }

  async function createCode() {
    setBusy(true); setError(null);
    const res = await fetch('/api/connection', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ display_name: name }),
    });
    const j = await res.json();
    if (!res.ok) setError(j.error ?? 'Something went wrong.');
    else setInvite(j.invite_code);
    setBusy(false);
  }

  async function join() {
    setBusy(true); setError(null);
    const res = await fetch('/api/connection/join', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ invite_code: joinCode.trim().toUpperCase(), display_name: name }),
    });
    const j = await res.json();
    if (!res.ok) { setError(j.error ?? 'Something went wrong.'); setBusy(false); return; }
    router.push('/today'); router.refresh();
  }

  if (loading) return <main className="phone" style={{ paddingTop: 80 }}><p className="body">One moment…</p></main>;

  return (
    <main className="phone" style={{ paddingTop: 56 }}>
      <p className="display h1" style={{ marginBottom: 6 }}>Who&apos;s your person?</p>
      <p className="body" style={{ color: 'var(--ink-muted)', marginTop: 0 }}>
        Corner only works with two. Everything you write stays yours — they never see it.
      </p>

      <div className="card" style={{ marginTop: 20 }}>
        <label className="caption" htmlFor="nm" style={{ textTransform: 'uppercase', letterSpacing: '.06em' }}>
          What should they call you?
        </label>
        <input
          id="nm" value={name} onChange={(e) => setName(e.target.value)} maxLength={40}
          placeholder="Your name"
          style={{
            width: '100%', marginTop: 8, padding: '14px 16px', font: 'inherit', fontSize: 16,
            border: '1px solid var(--line)', borderRadius: 'var(--r-md)', background: 'var(--surface)', color: 'var(--ink)',
          }}
        />
      </div>

      {invite ? (
        <div className="card card-warm">
          <p className="caption" style={{ marginTop: 0, textTransform: 'uppercase', letterSpacing: '.06em' }}>
            Send them this code
          </p>
          <p className="display" style={{ fontSize: 40, letterSpacing: '.12em', margin: '6px 0 10px' }}>{invite}</p>
          <button className="btn btn-quiet" onClick={() => navigator.clipboard?.writeText(invite)}>Copy code</button>
          <p className="small" style={{ marginBottom: 0, marginTop: 12 }}>
            Once they enter it, you&apos;ll both land on the daily check-in. You can start writing before they join —
            nothing is lost.
          </p>
          <button className="btn" style={{ marginTop: 12 }} onClick={() => router.push('/today')}>
            Start without waiting
          </button>
        </div>
      ) : (
        <div className="card">
          <p className="body" style={{ marginTop: 0 }}>Start a new connection and get a code to send them.</p>
          <button className="btn" disabled={busy || !name.trim()} onClick={createCode}>
            {busy ? 'One moment…' : 'Get a code'}
          </button>
        </div>
      )}

      <div className="card">
        <p className="body" style={{ marginTop: 0 }}>Or enter the code they sent you.</p>
        <input
          value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          maxLength={6} placeholder="ABC123" inputMode="text" autoCapitalize="characters"
          style={{
            width: '100%', padding: '14px 16px', font: 'inherit', fontSize: 22, letterSpacing: '.16em',
            textAlign: 'center', border: '1px solid var(--line)', borderRadius: 'var(--r-md)',
            background: 'var(--surface)', color: 'var(--ink)',
          }}
        />
        <button className="btn btn-quiet" style={{ marginTop: 12 }}
                disabled={busy || joinCode.trim().length !== 6 || !name.trim()} onClick={join}>
          {busy ? 'Checking…' : 'Join them'}
        </button>
      </div>

      {error && <p className="small" style={{ color: '#9E4A33', textAlign: 'center' }}>{error}</p>}
    </main>
  );
}
