'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { YiniScreen, type ActHandler } from './YiniScreen';
import { useToast } from './useToast';

type Step = 'invite' | 'buddy';

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

/** First name from the Google profile, so the person is never asked to type it. */
async function googleFirstName(): Promise<string | undefined> {
  const { data } = await createClient().auth.getUser();
  const meta = data.user?.user_metadata ?? {};
  const full = (meta.full_name ?? meta.name ?? '') as string;
  const first = full.trim().split(/\s+/)[0];
  return first ? first.slice(0, 40) : undefined;
}

/** Signed-in, not yet paired: get a code to share, pick a buddy, or join with a code. */
export function PairFlow() {
  const router = useRouter();
  const { toast, toastNode } = useToast();
  const [step, setStep] = useState<Step>('invite');
  const [code, setCode] = useState('');
  const [buddy, setBuddy] = useState<string | null>(null);
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [busy, setBusy] = useState(false);
  const name = useRef<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch('/api/connection');
      if (res.status === 401) { router.replace('/'); return; }
      const me = await res.json();
      if (cancelled) return;
      if (me.paired) { router.replace('/today'); return; }
      name.current = me.display_name || (await googleFirstName());
      if (me.invite_code) { setCode(me.invite_code); return; }
      const made = await postJson('/api/connection', { display_name: name.current });
      if (cancelled) return;
      if (made.ok) setCode(made.json.invite_code);
      else toast(made.json.error ?? 'Could not make your code. Refresh to try again.');
    })();
    return () => { cancelled = true; };
  }, [router, toast]);

  async function copy(text: string, done: string) {
    try { await navigator.clipboard.writeText(text); toast(done); }
    catch { toast(`Your code is ${code}.`); }
  }

  async function share() {
    if (!code) return;
    const message = `Come join me on Yini. Use my code ${code}. ${window.location.origin}`;
    if (typeof navigator.share === 'function') {
      try { await navigator.share({ text: message }); } catch { /* dismissed; still move on */ }
    } else {
      await copy(message, 'Invite copied. Paste it to your person.');
    }
    setTimeout(() => setStep('buddy'), 900);
  }

  async function bringBuddyHome() {
    if (!buddy) { toast('Pick a buddy first.'); return; }
    setBusy(true);
    const saved = await postJson('/api/connection', { display_name: name.current, species: buddy });
    if (!saved.ok) { toast(saved.json.error ?? 'Could not save your buddy.'); setBusy(false); return; }
    router.push('/today'); router.refresh();
  }

  async function join() {
    setBusy(true);
    const joined = await postJson('/api/connection/join', { invite_code: joinCode.trim().toUpperCase(), display_name: name.current });
    if (!joined.ok) { toast(joined.json.error ?? 'That code did not work.'); setBusy(false); return; }
    router.push('/today'); router.refresh();
  }

  const onAct: ActHandler = (act, target) => {
    switch (act) {
      case 'auth-back':
        if (step === 'buddy') setStep('invite');
        else void createClient().auth.signOut().then(() => { router.push('/'); router.refresh(); });
        break;
      case 'invite-share': void share(); break;
      case 'invite-copy': if (code) void copy(code, 'Code copied.'); break;
      case 'join-open': setJoinOpen(true); break;
      case 'pick-buddy': setBuddy((cur) => (cur === target.dataset.buddy ? null : target.dataset.buddy ?? null)); break;
      case 'buddy-go': if (!busy) void bringBuddyHome(); break;
    }
  };

  return (
    <div className="yini-page">
      <YiniScreen screen={step} onAct={onAct} buddy={buddy} code={code} />

      {joinOpen && (
        <div className="yscrim" onClick={(e) => { if (e.target === e.currentTarget) setJoinOpen(false); }}>
          <div className="ysheet" role="dialog" aria-modal="true" aria-label="Join with a code">
            <p className="ytitle">Enter your person’s code</p>
            <label htmlFor="joincode" className="sr-only">Invite code</label>
            <input
              id="joincode" className="yfield" maxLength={6} placeholder="ABC123" autoFocus
              autoCapitalize="characters" autoComplete="off"
              value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            />
            <button type="button" className="ybtn" disabled={busy || joinCode.trim().length !== 6} onClick={join}>
              {busy ? 'Checking…' : 'Join them'}
            </button>
            <button type="button" className="ylink" onClick={() => setJoinOpen(false)}>Close</button>
          </div>
        </div>
      )}
      {toastNode}
    </div>
  );
}
