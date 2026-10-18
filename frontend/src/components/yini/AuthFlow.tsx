'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { YiniScreen, type ActHandler } from './YiniScreen';
import { signInWithGoogle } from './google';
import { createClient } from '@/lib/supabase/client';
import { checkSignup, normalizeEmail, usernameToEmail } from '@/lib/auth/username';
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

  const field = (id: string) => (document.getElementById(id) as HTMLInputElement | null)?.value ?? '';

  /** Sign in with the email. (An older username-only account has no email, so it still works typed as its username.) */
  async function passwordSignIn(who: string, password: string) {
    const email = who.includes('@') ? normalizeEmail(who) : usernameToEmail(who);
    const { error } = await createClient().auth.signInWithPassword({ email, password });
    if (error) throw new Error('That email and password do not match.');
  }

  async function emailSignIn() {
    if (busy) return;
    const who = field('si-email'), password = field('si-pw');
    if (!who.trim() || !password) { toast('Enter your email and your password.'); return; }
    setBusy(true);
    try {
      await passwordSignIn(who, password);
      router.push('/pair'); router.refresh();
    } catch (e) { toast(e instanceof Error ? e.message : 'Could not sign in.'); setBusy(false); }
  }

  async function emailSignUp() {
    if (busy) return;
    const name = field('ca-name'), email = field('ca-email'), password = field('ca-pw');
    const problem = checkSignup(name, email, password);
    if (problem) { toast(problem); return; }
    if (!lover) { toast('Pick who you’re here with first.'); return; }
    setBusy(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name, email, password }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Could not create your account.');
      await passwordSignIn(email, password);
      router.push('/pair'); router.refresh();
    } catch (e) { toast(e instanceof Error ? e.message : 'Could not create your account.'); setBusy(false); }
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
      case 'signin-go': void emailSignIn(); break;
      case 'create-go': void emailSignUp(); break;
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
