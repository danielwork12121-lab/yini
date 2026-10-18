'use client';
import { clearJsonCache } from '@/lib/cachedJson';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { YiniScreen, type ActHandler } from './YiniScreen';
import { useToast } from './useToast';

type Step = 'howjoin' | 'invite' | 'joincode' | 'buddy' | 'privacy';

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
  const [step, setStep] = useState<Step>('howjoin');
  const [code, setCode] = useState('');
  const [buddy, setBuddy] = useState<string | null>('fluffy'); // the cat is the one live buddy for now
  const [busy, setBusy] = useState(false);
  // Nothing is drawn until we know where this person is, so a paired person never sees the invite page flash.
  const [ready, setReady] = useState(false);
  const name = useRef<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch('/api/connection');
      if (res.status === 401) { router.replace('/'); return; }
      const me = await res.json();
      if (cancelled) return;
      if (me.paired) { router.replace('/home'); return; }
      // 'You' is the database default for a profile with no name, so it counts as unset.
      name.current = me.display_name && me.display_name !== 'You' ? me.display_name : await googleFirstName();
      if (me.invite_code) { setCode(me.invite_code); setReady(true); return; }
      const made = await postJson('/api/connection', { display_name: name.current });
      if (cancelled) return;
      if (made.ok) setCode(made.json.invite_code);
      else toast(made.json.error ?? 'Could not make your code. Refresh to try again.');
      setReady(true);
    })();
    return () => { cancelled = true; };
  }, [router, toast]);

  // Keep the two phones in step. Before pairing: move on when the other person joins with your code.
  // On the buddy page: move on when either of you confirms the buddy.
  useEffect(() => {
    if (step !== 'howjoin' && step !== 'invite' && step !== 'buddy') return;
    let stopped = false;
    const tick = async () => {
      try {
        const res = await fetch('/api/connection', { cache: 'no-store' });
        if (!res.ok || stopped) return;
        const me = await res.json();
        if (stopped || !me.paired) return;
        if (step === 'howjoin' || step === 'invite') { toast(`${me.partner_display_name ?? 'Your person'} joined.`); setStep('buddy'); }
        else if (me.pet_species) setStep('privacy');
      } catch { /* offline for a moment; try again next tick */ }
    };
    const id = setInterval(tick, 2000);
    return () => { stopped = true; clearInterval(id); };
  }, [step, toast]);

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
    setBusy(false); setStep('privacy');
  }

  async function join() {
    if (busy) return;
    const joinCode = (document.getElementById('join-code') as HTMLInputElement | null)?.value ?? '';
    if (joinCode.trim().length !== 6) { toast('Enter the 6-character code they sent you.'); return; }
    setBusy(true);
    const joined = await postJson('/api/connection/join', { invite_code: joinCode.trim().toUpperCase(), display_name: name.current });
    if (!joined.ok) { toast(joined.json.error ?? 'That code did not work.'); setBusy(false); return; }
    // Paired now. They still pick a buddy and read the privacy page, like everyone else.
    setBusy(false); setStep('buddy');
  }

  const onAct: ActHandler = (act, target) => {
    switch (act) {
      case 'auth-back':
        if (step === 'privacy') setStep('buddy');
        else if (step === 'buddy') setStep('howjoin');
        else if (step === 'invite' || step === 'joincode') setStep('howjoin');
        else void createClient().auth.signOut().then(() => { clearJsonCache(); router.push('/'); router.refresh(); });
        break;
      case 'invite-share': void share(); break;
      case 'invite-copy': if (code) void copy(code, 'Code copied.'); break;
      case 'join-invite': setStep('invite'); break;
      case 'join-code': setStep('joincode'); break;
      case 'join-go': void join(); break;
      case 'pick-buddy': setBuddy((cur) => (cur === target.dataset.buddy ? null : target.dataset.buddy ?? null)); break;
      case 'buddy-go': if (!busy) void bringBuddyHome(); break;
      case 'privacy-go': router.push('/home'); router.refresh(); break;
    }
  };

  return (
    <div className="yini-page">
      {ready && <YiniScreen screen={step} onAct={onAct} buddy={buddy} code={code} />}

      {toastNode}
    </div>
  );
}
