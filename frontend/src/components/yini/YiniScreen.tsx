'use client';
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { SCREENS, type ScreenKey } from './screens';

const LABELS: Record<ScreenKey, string> = {
  welcome: 'Welcome', signin: 'Sign in', create: 'Create account',
  howjoin: 'How are you joining', invite: 'Invite your person', joincode: 'Join with a code', buddy: 'Pick your buddy', privacy: 'How your feelings stay yours',
};

/** The art boards are drawn at 941×1672 and scaled to the phone column. */
const ART_W = 941;
const ART_H = 1672;

export type ActHandler = (act: string, target: HTMLElement, event: React.MouseEvent) => void;

type Props = {
  screen: ScreenKey;
  onAct: ActHandler;
  /** Buddy tile currently picked (buddy screen). */
  buddy?: string | null;
  /** Whether the "Lover" tile is picked (create screen). */
  lover?: boolean;
  /** Text shown in the invite card (invite screen). */
  code?: string;
};

/**
 * One designed screen. The markup is trusted, generated from our own art
 * boards; it is never built from user input.
 */
export function YiniScreen({ screen, onAct, buddy = null, lover = false, code = '' }: Props) {
  const art = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);

  const fit = useCallback(() => {
    const a = art.current, i = inner.current;
    if (!a || !i) return;
    const scale = a.clientWidth / ART_W;
    i.style.transform = `scale(${scale})`;
    a.style.height = `${ART_H * scale}px`;
  }, []);

  useLayoutEffect(() => {
    fit();
    const a = art.current;
    if (!a || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(fit);
    ro.observe(a);
    return () => ro.disconnect();
  }, [fit, screen]);

  // Selection state lives on the generated DOM, so paint it after render.
  useEffect(() => {
    const root = inner.current;
    if (!root) return;
    root.querySelectorAll<HTMLElement>('[data-act="pick-buddy"]').forEach((t) => {
      const on = t.dataset.buddy === buddy;
      t.setAttribute('aria-pressed', String(on));
      t.style.borderColor = on ? '#EE8478' : '#F2E6D9';
      t.style.background = on ? '#FFF2EC' : '#FEF8EE';
    });
    const role = root.querySelector<HTMLElement>('#role-lover');
    const label = root.querySelector<HTMLElement>('#role-lover-label');
    if (role && label) {
      role.setAttribute('aria-pressed', String(lover));
      role.style.borderColor = lover ? '#EE8478' : '#F2E6D9';
      role.style.background = lover ? '#FFF2EC' : '#FEF8EE';
      label.style.color = lover ? '#D9533F' : '#3A2418';
    }
    const codeBox = root.querySelector<HTMLElement>('#invite-code');
    if (codeBox) codeBox.textContent = code;
  }, [screen, buddy, lover, code]);

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    const target = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
    if (!target) return;
    const act = target.dataset.act!;
    if (target.tagName === 'A') e.preventDefault();
    if (act === 'toggle-pw') {
      const input = inner.current?.querySelector<HTMLInputElement>(`#${target.dataset.for}`);
      if (input) {
        const show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        target.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
      }
      return;
    }
    onAct(act, target, e);
  }

  return (
    <div className="art" ref={art}>
      <div
        className="art-in" ref={inner} role="group" aria-label={LABELS[screen]}
        onClick={handleClick}
        dangerouslySetInnerHTML={{ __html: SCREENS[screen] }}
      />
    </div>
  );
}
