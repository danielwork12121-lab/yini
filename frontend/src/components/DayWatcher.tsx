'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { addDays } from '@/contract/policy';
import { deviceToday, useAppClock } from '@/lib/appClock';
import { DateTile } from './DateIcon';

/** Screens a signed-in person sees. The sign-in and onboarding pages never show the new-day card. */
const APP_PATHS = new Set(['/home', '/grow', '/glow', '/calendar', '/today']);
const FLIP_AT_MS = 700;
const LEAVE_AT_MS = 3200;

const longDate = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

type Arrival = { from: string; to: string };

/**
 * Watches the app's clock. When a new day begins (a demo fast-forward, or midnight on
 * the server's clock) it asks the page to look again and shows a short "new day" card
 * with the calendar flipping to the new date. It is only a message: it never moves you
 * to another page, and it never gets in the way of a half-finished log.
 */
export function DayWatcher() {
  const clock = useAppClock();
  const pathname = usePathname();
  const router = useRouter();
  const seen = useRef<number | null>(null);
  const path = useRef(pathname);
  const [arrival, setArrival] = useState<Arrival | null>(null);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => { path.current = pathname; }, [pathname]);

  useEffect(() => {
    if (!clock.loaded) return;
    const before = seen.current;
    seen.current = clock.offset;
    if (before === null || before === clock.offset) return; // the first reading is not a change
    const here = path.current;
    if (!APP_PATHS.has(here)) return;
    router.refresh(); // new day: the server looks again, which also starts the overnight read behind Grow
    const today = deviceToday();
    setFlipped(false);
    setArrival({ from: addDays(today, before), to: addDays(today, clock.offset) });
  }, [clock.loaded, clock.offset, router]);

  useEffect(() => {
    if (!arrival) return;
    const flip = setTimeout(() => setFlipped(true), FLIP_AT_MS);
    const leave = setTimeout(() => setArrival(null), LEAVE_AT_MS);
    return () => { clearTimeout(flip); clearTimeout(leave); };
  }, [arrival]);

  if (!arrival) return null;
  return (
    <div className="daywatch" role="status" aria-live="polite" onClick={() => setArrival(null)}>
      <div className="daywatch-card">
        <DateTile date={flipped ? arrival.to : arrival.from} large />
        <p className="daywatch-title">A new day</p>
        <p className="daywatch-date">Today is {longDate(arrival.to)}</p>
      </div>
    </div>
  );
}
