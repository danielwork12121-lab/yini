'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { clearJsonCache } from '@/lib/cachedJson';

/** Account & Security: how you sign in, and Log out. */
export function AccountView({ label, value, password, google }: { label: string; value: string; password: boolean; google: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logOut() {
    setBusy(true);
    await createClient().auth.signOut();
    clearJsonCache();
    router.push('/');
    router.refresh();
  }

  return (
    <>
      <label className="field-label" htmlFor="ac-id" style={{ marginTop: 0 }}>{label}</label>
      <input id="ac-id" className="field" value={value} readOnly />
      <h2 className="sec-label" style={{ marginTop: 'calc(30 * var(--u))' }}>Ways to sign in</h2>
      <div className="group">
        {password && <div className="srow" style={{ cursor: 'default' }}><span><b>{label === 'Email' ? 'Email & password' : 'Username & password'}</b></span><span className="badge-ok">Connected</span></div>}
        {google && <div className="srow" style={{ cursor: 'default' }}><span><b>Google</b></span><span className="badge-ok">Connected</span></div>}
      </div>
      <div className="pad" />
      <div className="sub-foot">
        <button type="button" className="cta cta-line" onClick={logOut} disabled={busy}>{busy ? 'Logging out…' : 'Log out'}</button>
      </div>
    </>
  );
}
