'use client';
import { useSyncExternalStore } from 'react';
import { addDays } from '@/contract/policy';

/**
 * The app's "today" on this device: the device's own local day plus the testing
 * clock's offset. The offset is 0 in normal life. When someone fast-forwards the app
 * for a demo, every open screen hears about it within a few seconds.
 */
type Snap = { offset: number; loaded: boolean };
const SERVER_SNAP: Snap = { offset: 0, loaded: false };
let snap: Snap = SERVER_SNAP;
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

/** The device's local day. Never a UTC slice, which rolls over at 5pm Pacific. */
export const deviceToday = () =>
  new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

async function pull(): Promise<void> {
  try {
    const res = await fetch('/api/clock', { cache: 'no-store' });
    if (!res.ok) return;
    const { day_offset } = (await res.json()) as { day_offset?: unknown };
    if (typeof day_offset !== 'number' || !Number.isInteger(day_offset)) return;
    if (day_offset !== snap.offset || !snap.loaded) {
      snap = { offset: day_offset, loaded: true };
      listeners.forEach((l) => l());
    }
  } catch { /* offline: keep what we have */ }
}

/** A fresh answer, for the moment it matters (saving a check-in). Falls back to the last known offset. */
export async function fetchAppToday(): Promise<string> {
  await pull();
  return addDays(deviceToday(), snap.offset);
}

const onVisible = () => { if (!document.hidden) void pull(); };
function start() {
  void pull();
  timer = setInterval(() => { if (!document.hidden) void pull(); }, 5000);
  document.addEventListener('visibilitychange', onVisible);
}
function stop() {
  if (timer) clearInterval(timer);
  timer = null;
  document.removeEventListener('visibilitychange', onVisible);
}
function subscribe(l: () => void) {
  listeners.add(l);
  if (listeners.size === 1) start();
  return () => { listeners.delete(l); if (listeners.size === 0) stop(); };
}

/** Today as this app sees it. Empty on the server, so the first client paint never disagrees with it. */
export const useAppToday = () =>
  useSyncExternalStore(subscribe, () => addDays(deviceToday(), snap.offset), () => '');

/** The offset itself, and whether it has been read yet. Stable between changes. */
export const useAppClock = () => useSyncExternalStore(subscribe, () => snap, () => SERVER_SNAP);
