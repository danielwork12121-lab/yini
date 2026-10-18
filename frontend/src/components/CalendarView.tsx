'use client';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CalendarDay, CalendarResponse } from '@/contract';
import { useAppToday } from '@/lib/appClock';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const monthOf = (date: string) => date.slice(0, 7);
const shiftMonth = (month: string, by: number) => {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + by, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
/** Dates are built at noon so a timezone never nudges them onto a neighbouring day. */
const parse = (date: string) => new Date(`${date}T12:00:00`);
const monthTitle = (month: string) => parse(`${month}-01`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
const longDate = (date: string) => parse(date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
const timeOf = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

/** Your own calendar: one emoji per day. Tap a day to read what you said, cut down to the notes that matter. */
export function CalendarView() {
  // The app's own "today": the device's day, moved by the testing clock when a demo is fast-forwarded.
  const today = useAppToday();
  const [picked, setMonth] = useState<string | null>(null);
  const month = picked ?? (today ? monthOf(today) : '');
  const [cache, setCache] = useState<Record<string, CalendarDay[]>>({});
  const [error, setError] = useState('');
  const [open, setOpen] = useState<CalendarDay | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!month || cache[month]) return;
    let cancelled = false;
    fetch(`/api/calendar?month=${month}`, { cache: 'no-store' })
      .then((res) => { if (!res.ok) throw new Error(); return res.json() as Promise<CalendarResponse>; })
      .then((body) => { if (!cancelled) { setError(''); setCache((c) => ({ ...c, [month]: body.days })); } })
      .catch(() => { if (!cancelled) setError('Could not load your calendar. Check your connection and try again.'); });
    return () => { cancelled = true; };
  }, [month, cache, attempt]);
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const days = month ? cache[month] : undefined;
  const byDate = useMemo(() => new Map((days ?? []).map((d) => [d.local_date, d])), [days]);

  if (!month) return <div className="cal"><p className="caption" style={{ textAlign: 'center' }}>Loading…</p></div>;

  const first = parse(`${month}-01`);
  const lead = first.getDay();
  const count = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const cells: (string | null)[] = [
    ...Array<null>(lead).fill(null),
    ...Array.from({ length: count }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`),
  ];

  return (
    <div className="cal">
      <header className="cal-head">
        <Link href="/home" className="cal-back">← Home</Link>
        <h1 className="display cal-title">Your calendar</h1>
        <p className="small cal-sub">A little emoji for every day you told Yini about. Tap one to see what you said.</p>
      </header>

      <div className="cal-nav">
        <button type="button" className="cal-step" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month">‹</button>
        <h2 className="display cal-month" aria-live="polite">{monthTitle(month)}</h2>
        <button type="button" className="cal-step" onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Next month">›</button>
      </div>

      <div className="cal-grid" role="grid" aria-label={monthTitle(month)}>
        {WEEKDAYS.map((w, i) => <div key={i} className="cal-dow" role="columnheader">{w}</div>)}
        {cells.map((date, i) => {
          if (!date) return <div key={`b${i}`} className="cal-cell cal-blank" role="gridcell" />;
          const day = byDate.get(date);
          const n = Number(date.slice(8));
          const cls = `cal-cell${date === today ? ' cal-today' : ''}${day ? ' cal-has' : ''}`;
          return day ? (
            <button key={date} type="button" role="gridcell" className={cls} onClick={() => setOpen(day)}
              aria-label={`${longDate(date)}, ${day.emoji}, ${day.jots.length} ${day.jots.length === 1 ? 'note' : 'notes'}`}>
              <span className="cal-num">{n}</span>
              <span className="cal-emoji" aria-hidden="true">{day.emoji}</span>
            </button>
          ) : (
            <div key={date} role="gridcell" className={cls} aria-label={longDate(date)}>
              <span className="cal-num">{n}</span>
            </div>
          );
        })}
      </div>

      {error && <p className="small" role="alert" style={{ color: '#9E4A33', textAlign: 'center' }}>{error} <button className="link" onClick={() => setAttempt((n) => n + 1)}>Retry</button></p>}
      {!error && !days && <p className="caption" style={{ textAlign: 'center' }}>Loading…</p>}
      {days && days.length === 0 && !error && (
        <p className="small" style={{ textAlign: 'center', marginTop: 18 }}>
          Nothing here yet. Tell Yini about your day and it will show up on this page.
        </p>
      )}

      <p className="caption" style={{ textAlign: 'center', marginTop: 26 }}>Only you can see your calendar. Your person never sees it.</p>

      {open && (
        <div className="cal-scrim" onClick={(e) => { if (e.target === e.currentTarget) setOpen(null); }}>
          <div className="cal-sheet" role="dialog" aria-modal="true" aria-label={longDate(open.local_date)}>
            <button type="button" ref={closeRef} className="cal-close" onClick={() => setOpen(null)} aria-label="Close">×</button>
            <p className="caption cal-sheet-date">{longDate(open.local_date)}</p>
            <div className="cal-sheet-top">
              <span className="cal-big" aria-hidden="true">{open.emoji}</span>
              <h3 className="display cal-sheet-title">{open.headline || 'You checked in'}</h3>
            </div>

            {open.jots.length > 0 ? (
              <ul className="cal-jots">{open.jots.map((j, i) => <li key={i}>{j}</li>)}</ul>
            ) : (
              <p className="small">No short notes for this day.</p>
            )}

            {open.entries.length > 0 && (
              <details className="cal-said">
                <summary>What you said</summary>
                {open.entries.map((e) => (
                  <div key={e.id} className="cal-entry">
                    <p className="caption">{timeOf(e.created_at)} · {e.input_mode === 'voice' ? 'Voice' : 'Typed'}</p>
                    <p className="body" style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{e.text}</p>
                  </div>
                ))}
              </details>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
