'use client';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { DailyFeedbackView, GrowDoneResponse, GrowResponse } from '@/contract';
import { fetchJson, HttpError, peekJson, putJson } from '@/lib/cachedJson';

/** Dates are built at noon so a timezone never nudges them onto a neighbouring day. */
const longDate = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
const shortDate = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

const URL = '/api/grow';
const POLL_MS = 3000;
const LEAVE_MS = 320;
const SEEN_KEY = 'yini.grow.seen';

const readSeen = (): Set<string> => {
  try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]') as string[]); } catch { return new Set(); }
};
const writeSeen = (seen: Set<string>) => {
  try { localStorage.setItem(SEEN_KEY, JSON.stringify([...seen].slice(-200))); } catch { /* a convenience only */ }
};

/**
 * Grow: small things you can do for the two of you. Yini works them out from what you
 * have both been logging and never shows what anyone wrote. Tap one when you have done
 * it and it moves to a quiet list at the bottom; whatever is new stands out at the top.
 */
export function GrowView() {
  const [data, setData] = useState<GrowResponse | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [leaving, setLeaving] = useState<string | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [flash, setFlash] = useState('');
  const working = data?.status === 'working';
  const seenOnce = useRef(false);

  // Show the last answer at once, then ask again. While a day is still being read, keep asking.
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const cached = peekJson<GrowResponse>(URL);
    if (cached) queueMicrotask(() => { if (!cancelled) setData((d) => d ?? cached); });
    const load = async () => {
      try {
        const body = await fetchJson<GrowResponse>(URL);
        if (cancelled) return;
        setError('');
        setData(body);
        if (body.status === 'working') timer = setTimeout(load, POLL_MS);
      } catch (e) {
        if (e instanceof HttpError && e.status === 401) { window.location.assign('/'); return; }
        const why = (e as Error).message;
        if (!cancelled) setError(why ? `Could not load Grow. ${why}` : 'Could not load Grow. Check your connection and try again.');
      }
    };
    void load();
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, [attempt]);

  // Anything not seen here before is "new". After a moment on screen it counts as seen.
  useEffect(() => {
    if (!data || data.feedback.length === 0) return;
    const all = data.feedback.flatMap((f) => f.bullets);
    if (!seenOnce.current) {
      seenOnce.current = true;
      const seen = readSeen();
      setFresh(new Set(seen.size === 0 ? [] : all.filter((b) => !seen.has(b))));
    }
    const t = setTimeout(() => { const seen = readSeen(); all.forEach((b) => seen.add(b)); writeSeen(seen); }, 4000);
    return () => clearTimeout(t);
  }, [data]);

  const setDone = useCallback(async (text: string, done: boolean) => {
    setFlash('');
    const before = data;
    const apply = (list: GrowResponse['done']) => setData((d) => { if (!d) return d; const next = { ...d, done: list }; putJson(URL, next); return next; });
    // Optimistic: it moves straight away, and comes back if the server says no.
    if (before) {
      apply(done
        ? [{ id: `tmp-${text}`, text, done_at: new Date().toISOString() }, ...before.done.filter((x) => x.text !== text)]
        : before.done.filter((x) => x.text !== text));
    }
    try {
      const res = await fetch('/api/grow/done', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, done }) });
      if (!res.ok) throw new Error();
      apply(((await res.json()) as GrowDoneResponse).done);
    } catch {
      if (before) apply(before.done);
      setFlash('That did not save. Try again in a moment.');
    }
  }, [data]);

  const tick = (text: string) => {
    if (leaving) return;
    setLeaving(text);
    setTimeout(() => { setLeaving(null); void setDone(text, true); }, LEAVE_MS);
  };

  const doneSet = new Set((data?.done ?? []).map((d) => d.text));
  const [latest, ...earlier] = data?.feedback ?? [];
  const openOf = (fb: DailyFeedbackView) => fb.bullets.filter((b) => !doneSet.has(b));
  const stillOpen = earlier.flatMap((fb) => openOf(fb).map((text) => ({ text, date: fb.local_date })));
  const partner = data?.partner_display_name ?? 'your person';
  const nothing = data && !latest && data.from_partner.length === 0;

  return (
    <div className="gg gg-grow">
      <Link href="/home" className="cal-back">← Home</Link>
      <h1 className="display gg-title">Grow <span aria-hidden="true">🌱</span></h1>
      <p className="small gg-sub">Small things you can do for the two of you. Yini works them out from what you have both been logging, and never shows what anyone wrote. Tap one when you have done it.</p>

      {error && <p className="small" role="alert" style={{ color: '#9E4A33' }}>{error} <button type="button" className="link" onClick={() => setAttempt((n) => n + 1)}>Retry</button></p>}
      {flash && <p className="small" role="alert" style={{ color: '#9E4A33' }}>{flash}</p>}
      {!data && !error && <p className="caption" style={{ textAlign: 'center' }}>Loading…</p>}

      {working && (
        <div className="gg-note" role="status" aria-live="polite">
          <span className="yhome-dots" aria-hidden="true"><i /><i /><i /></span>
          {data?.feedback.length ? 'Yini is catching up with what you just wrote.' : 'Yini is reading your day. This takes under a minute.'}
        </div>
      )}
      {data?.status === 'failed' && (
        <div className="gg-note gg-note-warn" role="status">
          <span>
            Yini&apos;s last read did not go through. It will try again in a few minutes.
            {data.problem && <small className="gg-why">{data.problem}</small>}
          </span>
          <button type="button" className="link" onClick={() => setAttempt((n) => n + 1)}>Check again</button>
        </div>
      )}

      {latest && (
        <section className="gg-latest" aria-labelledby="gg-latest-h">
          <p className="caption gg-kicker">Latest · {longDate(latest.local_date)}</p>
          <h2 id="gg-latest-h" className="display gg-headline">{latest.headline}</h2>
          {openOf(latest).length > 0 ? (
            <ul className="gg-list">
              {openOf(latest).map((b) => <Task key={b} text={b} isNew={fresh.has(b)} leaving={leaving === b} onTick={tick} strong />)}
            </ul>
          ) : (
            <p className="body gg-caughtup">All of these are done. Yini will have more for you as you keep logging.</p>
          )}
        </section>
      )}

      {stillOpen.length > 0 && (
        <section className="gg-section" aria-labelledby="gg-open">
          <h2 id="gg-open" className="gg-h">Still open</h2>
          <ul className="gg-list">
            {stillOpen.map((o) => <Task key={o.text} text={o.text} isNew={fresh.has(o.text)} leaving={leaving === o.text} onTick={tick} when={shortDate(o.date)} />)}
          </ul>
        </section>
      )}

      {data && data.from_partner.length > 0 && (
        <section className="gg-section" aria-labelledby="gg-know">
          <h2 id="gg-know" className="gg-h">Good to know about {partner}</h2>
          <ul className="gg-list">
            {data.from_partner.map((n) => (
              <li key={n.id} className="gg-item gg-item-soft">
                <p className="body gg-text">{n.body_text}</p>
                <p className="caption gg-when">{shortDate(n.delivered_on)}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {data && data.done.length > 0 && (
        <section className="gg-section gg-donesec" aria-labelledby="gg-done">
          <h2 id="gg-done" className="gg-h">Done <span className="gg-count">{data.done.length}</span></h2>
          <ul className="gg-list">
            {data.done.map((d) => (
              <li key={d.id}>
                <button type="button" className="gg-item gg-tap gg-isdone" aria-pressed="true" aria-label={`Done: ${d.text}. Tap to mark as not done.`} onClick={() => void setDone(d.text, false)}>
                  <span className="gg-check gg-checked" aria-hidden="true">✓</span>
                  <span className="body gg-text">{d.text}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {data?.status === 'waiting' && (
        <div className="gg-empty">
          <p className="gg-empty-emoji" aria-hidden="true">🌙</p>
          <p className="body">Yini has your log. Your Grow shows up here as soon as it has read it.</p>
        </div>
      )}
      {data?.status === 'empty' && (
        <div className="gg-empty">
          <p className="gg-empty-emoji" aria-hidden="true">🌱</p>
          <p className="body">Nothing to grow from yet. Tell Yini about your day, and your first Grow appears here.</p>
          <Link href="/today" className="yhome-btn" style={{ marginTop: 14 }}>🎙 Tell Yini about your day</Link>
        </div>
      )}
      {nothing && data.status === 'ready' && (
        <div className="gg-empty">
          <p className="gg-empty-emoji" aria-hidden="true">🌤️</p>
          <p className="body">Nothing new yet. Keep telling Yini about your days and this page will fill in.</p>
        </div>
      )}

      <p className="caption gg-foot">Only you can see this page. What {partner} writes stays {partner}&apos;s.</p>
    </div>
  );
}

function Task({ text, isNew, leaving, onTick, when, strong }: {
  text: string; isNew: boolean; leaving: boolean; onTick: (t: string) => void; when?: string; strong?: boolean;
}) {
  return (
    <li className={`gg-task${leaving ? ' gg-leaving' : ''}`}>
      <button type="button" className={`gg-item gg-tap${strong ? ' gg-strong' : ''}${isNew ? ' gg-newitem' : ''}`} aria-pressed={leaving} aria-label={`Mark as done: ${text}`} onClick={() => onTick(text)}>
        <span className={`gg-check${leaving ? ' gg-checked' : ''}`} aria-hidden="true">{leaving ? '✓' : ''}</span>
        <span className="gg-body">
          <span className="body gg-text">{text}</span>
          {(isNew || when) && <span className="caption gg-meta">{isNew && <b className="gg-newpill">New</b>}{when}</span>}
        </span>
      </button>
    </li>
  );
}
