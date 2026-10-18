'use client';
import Link from 'next/link';
import { CheckIcon, SproutBig, SproutSmall } from '@/components/app/icons';
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
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: { message?: string } | string } | null;
        const msg = typeof body?.error === 'string' ? body.error : body?.error?.message;
        throw new Error(msg);
      }
      apply(((await res.json()) as GrowDoneResponse).done);
    } catch (e) {
      if (before) apply(before.done);
      const why = e instanceof Error && e.message ? ` (${e.message})` : '';
      setFlash(`That did not save${why}. Try again in a moment.`);
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
    <main className="pg">
      <header className="ph">
        <SproutBig />
        <h1>Grow</h1>
        <p>Little things you can do to grow closer.</p>
      </header>

      {error && <div className="note note-warn" role="alert"><span>{error}</span><button type="button" className="linkbtn" onClick={() => setAttempt((n) => n + 1)}>Retry</button></div>}
      {flash && <div className="note note-warn" role="alert"><span>{flash}</span></div>}
      {!data && !error && <div className="note" role="status"><span className="dots" aria-hidden="true"><i /><i /><i /></span>Loading…</div>}

      {working && (
        <div className="note" role="status" aria-live="polite">
          <span className="dots" aria-hidden="true"><i /><i /><i /></span>
          {data?.feedback.length ? 'Yini is catching up with what you just wrote.' : 'Yini is reading your day. This takes under a minute.'}
        </div>
      )}
      {data?.status === 'failed' && (
        <div className="note note-warn" role="status">
          <span>
            Yini&apos;s last read did not go through. It will try again in a few minutes.
            {data.problem && <small>{data.problem}</small>}
          </span>
          <button type="button" className="linkbtn" onClick={() => setAttempt((n) => n + 1)}>Check again</button>
        </div>
      )}

      {latest && (
        <section aria-labelledby="gg-latest-h">
          <div className="lead"><span>Latest · {longDate(latest.local_date)}</span><b id="gg-latest-h">{latest.headline}</b></div>
          {openOf(latest).length > 0 ? (
            <ul className="pg-list" style={{ marginTop: 'calc(24 * var(--u))' }}>
              {openOf(latest).map((b) => <Task key={b} text={b} isNew={fresh.has(b)} leaving={leaving === b} onTick={tick} label="Tonight" />)}
            </ul>
          ) : (
            <p className="caught">All of these are done. Yini will have more for you as you keep logging.</p>
          )}
        </section>
      )}

      {stillOpen.length > 0 && (
        <section aria-labelledby="gg-open">
          <h2 id="gg-open" className="sec-h">Still open</h2>
          <ul className="pg-list" style={{ marginTop: 'calc(16 * var(--u))' }}>
            {stillOpen.map((o) => <Task key={o.text} text={o.text} isNew={fresh.has(o.text)} leaving={leaving === o.text} onTick={tick} label={shortDate(o.date)} />)}
          </ul>
        </section>
      )}

      {data && data.from_partner.length > 0 && (
        <section aria-labelledby="gg-know">
          <h2 id="gg-know" className="sec-h">Good to know about {partner}</h2>
          <ul className="pg-list" style={{ marginTop: 'calc(16 * var(--u))' }}>
            {data.from_partner.map((n) => (
              <li key={n.id} className="sug sug-know">
                <p>{n.body_text}</p>
                <span className="sug-when">{shortDate(n.delivered_on)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {data && data.done.length > 0 && (
        <section aria-labelledby="gg-done">
          <h2 id="gg-done" className="sec-h">Done <small>{data.done.length}</small></h2>
          <ul className="pg-list" style={{ marginTop: 'calc(16 * var(--u))' }}>
            {data.done.map((d) => (
              <li key={d.id} className="sug sug-done">
                <div className="sug-text"><h3>{d.text}</h3></div>
                <div className="sug-act">
                  <button type="button" className="sug-badge" aria-label={`Done: ${d.text}. Tap to mark as not done.`} onClick={() => void setDone(d.text, false)}>
                    <CheckIcon />Done
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {data?.status === 'waiting' && (
        <div className="empty"><SproutSmall /><b>Yini has your log</b><span>Your Grow shows up here as soon as it has read it.</span></div>
      )}
      {data?.status === 'empty' && (
        <div className="empty">
          <SproutSmall /><b>A little room to grow ♡</b>
          <span>Tell Yini about your day, and your first Grow appears here.</span>
          <Link href="/today" className="pill empty-btn">Check in</Link>
        </div>
      )}
      {nothing && data.status === 'ready' && (
        <div className="empty"><SproutSmall /><b>A little room to grow ♡</b><span>Your next little step will find its way here.</span></div>
      )}

      <p className="foot">Only you can see this page. What {partner} writes stays {partner}&apos;s.</p>
    </main>
  );
}

function Task({ text, isNew, leaving, onTick, label }: {
  text: string; isNew: boolean; leaving: boolean; onTick: (t: string) => void; label: string;
}) {
  return (
    <li className={`sug${isNew ? ' sug-new' : ''}${leaving ? ' sug-leave' : ''}`}>
      <div className="sug-text">
        <span className={`sug-cat${isNew ? ' sug-cat-new' : ''}`}>{isNew ? 'New' : label}</span>
        <h3>{text}</h3>
      </div>
      <div className="sug-act">
        <button type="button" className="pill pill-green sug-btn" aria-label={`Mark as done: ${text}`} onClick={() => onTick(text)}>I did it</button>
      </div>
    </li>
  );
}
