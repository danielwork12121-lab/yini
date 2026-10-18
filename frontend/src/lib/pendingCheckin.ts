'use client';
import { useSyncExternalStore } from 'react';
import type { CheckinResponse } from '@/contract';

/**
 * A check-in that is sent in the background, so the person can leave the record page
 * the moment they tap Send and not wait on the AI. The state lives at module level, so
 * it survives client-side navigation, and the finished reply is kept in sessionStorage
 * so a refresh on Home still shows it.
 */
export type CheckinBody = {
  text: string; input_mode: 'voice' | 'text'; audio_duration_ms: number | null;
  transcript_failed: boolean; local_date: string;
};
export type PendingState =
  | { status: 'idle' }
  | { status: 'working'; body: CheckinBody }
  | { status: 'done'; reply: CheckinResponse }
  | { status: 'error'; message: string; body: CheckinBody };

const KEY = 'yini:checkin-reply';
const IDLE: PendingState = { status: 'idle' };
let state: PendingState = IDLE;
let restored = false;
const listeners = new Set<() => void>();

function set(next: PendingState) {
  state = next;
  try {
    if (next.status === 'done') sessionStorage.setItem(KEY, JSON.stringify(next.reply));
    else sessionStorage.removeItem(KEY);
  } catch { /* private mode: the in-memory copy still works */ }
  listeners.forEach((l) => l());
}

function restore() {
  if (restored) return;
  restored = true;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw && state.status === 'idle') state = { status: 'done', reply: JSON.parse(raw) as CheckinResponse };
  } catch { /* ignore */ }
}

export function startCheckin(body: CheckinBody) {
  restored = true;
  set({ status: 'working', body });
  // keepalive lets the request finish even if the tab is closed right after Send.
  fetch('/api/checkin', {
    method: 'POST', keepalive: true,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...body, connection_id: null, audio_path: null }),
  })
    .then(async (res) => {
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { error?: string }).error ?? 'Something went wrong.');
      set({ status: 'done', reply: json as CheckinResponse });
    })
    .catch((e: unknown) => {
      set({ status: 'error', body, message: e instanceof Error && e.message !== 'Failed to fetch' ? e.message : 'Network hiccup. Your words are still here.' });
    });
}

export const retryCheckin = () => { if (state.status === 'error') startCheckin(state.body); };
export const dismissCheckin = () => set(IDLE);

const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
const snapshot = () => { restore(); return state; };
export const usePendingCheckin = () => useSyncExternalStore(subscribe, snapshot, () => IDLE);
