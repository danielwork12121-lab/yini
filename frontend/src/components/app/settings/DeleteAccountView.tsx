'use client';
import { useState } from 'react';

/** Delete Account as drawn. Account deletion is not switched on yet, so nothing here can delete anything. */
export function DeleteAccountView({ partner }: { partner: string }) {
  const [ok, setOk] = useState(false);
  const [word, setWord] = useState('');
  return (
    <>
      <div className="card-plain card-danger">
        <h3>This can’t be undone</h3>
        <p>Deleting your account permanently removes:</p>
        <ul>
          <li>Your journal entries and voice recordings</li>
          <li>Everything Yini remembers about you</li>
          <li>Your Grow steps, reflections and moods</li>
          <li>Love Notes you’ve received</li>
        </ul>
        <p>{partner}’s own account and journal stay safe. Your shared connection and buddy will end for both of you.</p>
      </div>
      <div className="pad" />
      <label style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 'var(--t-body)', fontWeight: 800 }}>
        <input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} style={{ width: 22, height: 22, accentColor: '#F0857A' }} />
        I understand my data will be permanently deleted.
      </label>
      <label className="field-label" htmlFor="da-word" style={{ marginTop: 'calc(10 * var(--u))' }}>Type DELETE to confirm</label>
      <input id="da-word" className="field" value={word} placeholder="DELETE" autoComplete="off" onChange={(e) => setWord(e.target.value)} style={{ letterSpacing: '.08em' }} />
      <p className="field-note">For your safety, you’ll be asked to sign in again before we delete anything.</p>
      <div className="sub-foot">
        <button type="button" className="cta" disabled style={{ background: '#E8ADA2' }} aria-describedby="da-note">Delete my account</button>
        <p id="da-note" className="fineprint" style={{ margin: 0 }}>Account deletion is not switched on yet{ok && word === 'DELETE' ? '. Nothing was deleted.' : '.'}</p>
      </div>
    </>
  );
}
