'use client';
import { CalendarBig, ChevLeft, ChevRight, SparkIcon } from '@/components/app/icons';
import { useEffect, useMemo, useState } from 'react';
import type { CalendarDay, CalendarResponse } from '@/contract';
import { useAppToday } from '@/lib/appClock';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const CLAMP = 150;

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
  const [openDate, setOpenDate] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
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

  const days = month ? cache[month] : undefined;
  const byDate = useMemo(() => new Map((days ?? []).map((d) => [d.local_date, d])), [days]);
  // Today's page opens on today when there is something to show; otherwise on the latest day with an entry.
  const open: CalendarDay | undefined = (openDate ? byDate.get(openDate) : undefined)
    ?? (picked === null && today ? byDate.get(today) : undefined);

  if (!month) return <main className="pg"><div className="note" role="status"><span className="dots" aria-hidden="true"><i /><i /><i /></span>Loading…</div></main>;

  const first = parse(`${month}-01`);
  const lead = first.getDay();
  const count = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const cells: (string | null)[] = [
    ...Array<null>(lead).fill(null),
    ...Array.from({ length: count }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`),
  ];

  return (
    <main className="pg">
      <header className="ph">
        <CalendarBig />
        <h1>Calendar</h1>
      </header>

      <div className="cal-nav">
        <button type="button" className="cal-step" onClick={() => { setMonth(shiftMonth(month, -1)); setOpenDate(null); }} aria-label="Previous month"><ChevLeft /></button>
        <h2 className="cal-month" aria-live="polite">{monthTitle(month)}</h2>
        <button type="button" className="cal-step" onClick={() => { setMonth(shiftMonth(month, 1)); setOpenDate(null); }} aria-label="Next month"><ChevRight /></button>
      </div>

      <div className="cal-card">
        <div className="cal-dows" aria-hidden="true">{WEEKDAYS.map((w, i) => <span key={i}>{w}</span>)}</div>
        <div className="cal-grid" role="grid" aria-label={monthTitle(month)}>
          {cells.map((date, i) => {
            if (!date) return <span key={`b${i}`} className="cal-cell blank" />;
            const day = byDate.get(date);
            const n = Number(date.slice(8));
            const cls = `cal-cell${today && date <= today ? ' past' : ''}${today && date > today ? ' future' : ''}${day ? ' has' : ''}${date === today ? ' today' : ''}${open?.local_date === date ? ' sel' : ''}`;
            return day ? (
              <button key={date} type="button" role="gridcell" className={cls} aria-selected={open?.local_date === date}
                onClick={() => setOpenDate(date)}
                aria-label={`${longDate(date)}, ${day.emoji}, ${day.jots.length} ${day.jots.length === 1 ? 'note' : 'notes'}`}>
                <span className="n">{n}</span>
                <span className="em" aria-hidden="true">{day.emoji}</span>
              </button>
            ) : (
              <span key={date} role="gridcell" className={cls} aria-label={longDate(date)}><span className="n">{n}</span></span>
            );
          })}
        </div>
      </div>

      {error && <div className="note note-warn" role="alert"><span>{error}</span><button className="linkbtn" onClick={() => setAttempt((n) => n + 1)}>Retry</button></div>}
      {!error && !days && <div className="note" role="status"><span className="dots" aria-hidden="true"><i /><i /><i /></span>Loading…</div>}

      {open ? (
        <section className="day" aria-label={longDate(open.local_date)}>
          <div className="day-row">
            <span className="day-em" aria-hidden="true">{open.emoji}</span>
            <span className="day-date">{longDate(open.local_date)}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(10 * var(--u))' }}>
            <span className="day-sum"><SparkIcon />Yini’s summary</span>
            <p>{open.headline || 'You checked in.'}</p>
          </div>

          {open.jots.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(12 * var(--u))' }}>
              <span className="day-h">Little notes</span>
              <ul className="day-jots">{open.jots.map((j, i) => <li key={i}>{j}</li>)}</ul>
            </div>
          )}

          {open.entries.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(12 * var(--u))' }}>
              <span className="day-h">{open.entries.length === 1 ? 'What you said' : 'What you said today'}</span>
              {open.entries.map((e) => {
                const long = e.text.length > CLAMP;
                const full = expanded[e.id];
                const shown = long && !full ? `${e.text.slice(0, CLAMP).replace(/\s+\S*$/, '')}…` : e.text;
                return (
                  <div key={e.id} className="day-entry">
                    <div className="day-entry-top">
                      <span>{timeOf(e.created_at)} · {e.input_mode === 'voice' ? 'Voice' : 'Typed'}</span>
                      {long && <button type="button" className="linkbtn" aria-expanded={!!full} onClick={() => setExpanded((x) => ({ ...x, [e.id]: !full }))}>{full ? 'Show less' : 'Read more'}</button>}
                    </div>
                    <p>{shown}</p>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      ) : days && days.length === 0 && !error ? (
        <p className="day-hint">Nothing here yet. Check in with Yini and your day will show up on this page.</p>
      ) : days && !error ? (
        <p className="day-hint">Tap a day to see what you told Yini.</p>
      ) : null}

      <p className="foot">Only you can see your calendar. Your person never sees it.</p>
    </main>
  );
}
