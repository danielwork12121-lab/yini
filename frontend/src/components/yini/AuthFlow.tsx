'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { YiniScreen, type ActHandler } from './YiniScreen';
import { signInWithGoogle } from './google';
import { useToast } from './useToast';
import type { ScreenKey } from './screens';

/** Logged-out screens: welcome, sign in, create account. */
export function AuthFlow({ screen, demo = false }: { screen: Extract<ScreenKey, 'welcome' | 'signin' | 'create'>; demo?: boolean }) {
  const router = useRouter();
  const { toast, toastNode } = useToast();
  const [lover, setLover] = useState(false);
  const [busy, setBusy] = useState(false);

  async function google() {
    if (busy) return;
    setBusy(true);
    toast('Opening Google…');
    const err = await signInWithGoogle('/pair');
    if (err) { toast(err); setBusy(false); }
  }

  async function enterDemo(role: 'avery' | 'sam') {
    setBusy(true);
    const res = await fetch('/api/demo/login', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ role }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      toast(j.error ?? 'Could not sign in.'); setBusy(false); return;
    }
    router.push('/today'); router.refresh();
  }

  const onAct: ActHandler = (act, _t, e) => {
    switch (act) {
      case 'get-started': router.push('/create'); break;
      case 'auth-back': router.push('/'); break;
      case 'to-create': e.preventDefault(); router.push('/create'); break;
      case 'pick-lover': setLover((v) => !v); break;
      case 'auth-google': void google(); break;
      // Email and password sign-in is not built yet; Google is the one way in.
      case 'signin-go':
        toast('Email sign-in is coming soon. Continue with Google for now.'); break;
      case 'create-go':
        if (!lover) { toast('Pick who you’re here with first.'); break; }
        void google(); break;
    }
  };

  return (
    <div className="yini-page">
      <YiniScreen screen={screen} onAct={onAct} lover={lover} />
      {screen === 'welcome' && (
        <p className="yini-foot">
          Already have an account? <Link href="/signin">Sign in</Link>
        </p>
      )}
      {demo && screen === 'welcome' && (
        <div className="yini-demo">
          <span>Demo</span>
          <button type="button" disabled={busy} onClick={() => enterDemo('avery')}>I’m Avery</button>
          <button type="button" disabled={busy} onClick={() => enterDemo('sam')}>I’m Sam</button>
        </div>
      )}
      {toastNode}
    </div>
  );
}
