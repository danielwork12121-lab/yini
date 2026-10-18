'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { PersonIcon } from '@/components/app/icons';
import { useAppToast } from '@/components/app/useAppToast';

/** My Profile: the name your person sees. Saving uses the same call the pairing flow does. */
export function ProfileForm({ name, email, usernameLogin }: { name: string; email: string; usernameLogin: boolean }) {
  const router = useRouter();
  const [value, setValue] = useState(name);
  const [busy, setBusy] = useState(false);
  const { toast, node } = useAppToast();
  const changed = value.trim() !== name && value.trim().length > 0;

  async function save() {
    if (!changed || busy) return;
    setBusy(true);
    try {
      const res = await fetch('/api/connection', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ display_name: value.trim() }) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Could not save.');
      toast('Saved.');
      router.refresh();
    } catch (e) { toast(e instanceof Error ? e.message : 'Could not save.'); }
    setBusy(false);
  }

  return (
    <>
      <div className="avatar" aria-hidden="true"><PersonIcon stroke="#D9A89B" /></div>
      <div style={{ textAlign: 'center' }}>
        <button type="button" className="pill pill-quiet" disabled title="Photos are not switched on yet" style={{ minHeight: 44 }}>Change photo</button>
      </div>
      <label className="field-label" htmlFor="pf-name">The name your partner calls you</label>
      <input id="pf-name" className="field" value={value} maxLength={40} placeholder="Your name" onChange={(e) => setValue(e.target.value)} />
      <p className="field-note">Shown to your partner and across the app.</p>
      <label className="field-label" htmlFor="pf-email">{usernameLogin ? 'Username' : 'Email'}</label>
      <input id="pf-email" className="field" value={email} readOnly />
      <div className="pad" />
      <div className="sub-foot">
        <button type="button" className="cta" disabled={!changed || busy} onClick={save}>{busy ? 'Saving…' : 'Save changes'}</button>
      </div>
      {node}
    </>
  );
}
