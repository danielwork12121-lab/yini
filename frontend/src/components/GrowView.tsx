'use client';
import Link from 'next/link';
import { BookmarkIcon, CheckIcon, SproutBig, SproutSmall } from '@/components/app/icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { DailyFeedbackView, GrowItemRequest, GrowItemResponse, GrowItemView, GrowOutcome, GrowResponse } from '@/contract';
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
  const [sheet, setSheet] = useState<{ text: string; mode: 'done' | 'skipped' } | null>(null);
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

  /** Bookmark, do, skip or reflect. It shows at once and comes back if the server says no. */
  const update = useCallback(async (text: string, patch: Omit<GrowItemRequest, 'text'>) => {
    setFlash('');
    const before = data;
    const apply = (items: GrowItemView[]) => setData((d) => { if (!d) return d; const next = { ...d, items }; putJson(URL, next); return next; });
    if (before) {
      const was = before.items.find((i) => i.text === text) ?? { text, saved: false, status: null, outcome: null, reflection: null, done_at: null };
      const now: GrowItemView = {
        ...was,
        ...(patch.saved !== undefined ? { saved: patch.saved } : {}),
        ...(patch.status === 'open' ? { status: null, outcome: null, reflection: null, done_at: null } : patch.status ? { status: patch.status, done_at: new Date().toISOString() } : {}),
        ...(patch.outcome !== undefined ? { outcome: patch.outcome } : {}),
        ...(patch.reflection !== undefined ? { reflection: patch.reflection } : {}),
      };
      apply([now, ...before.items.filter((i) => i.text !== text)]);
    }
    try {
      const res = await fetch('/api/grow/item', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, ...patch }) });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: { message?: string } | string } | null;
        const msg = typeof body?.error === 'string' ? body.error : body?.error?.message;
        throw new Error(msg);
      }
      apply(((await res.json()) as GrowItemResponse).items);
    } catch (e) {
      if (before) apply(before.items);
      const why = e instanceof Error && e.message ? ` (${e.message})` : '';
      setFlash(`That did not save${why}. Try again in a moment.`);
    }
  }, [data]);

  /** "I did it" and "Not this time": the card slides away, then the reflect sheet offers to say how it went. */
  const resolve = (text: string, status: 'done' | 'skipped') => {
    if (leaving) return;
    setLeaving(text);
    setTimeout(() => { setLeaving(null); void update(text, { status }); setSheet({ text, mode: status }); }, LEAVE_MS);
  };

  const byText = new Map((data?.items ?? []).map((i) => [i.text, i]));
  const stateOf = (t: string) => byText.get(t);
  const isOpen = (t: string) => !stateOf(t)?.status;
  const isSaved = (t: string) => !!stateOf(t)?.saved;
  const [latest, ...earlier] = data?.feedback ?? [];
  const latestOpen = latest ? latest.bullets.filter((b) => isOpen(b) && !isSaved(b)) : [];
  const stillOpen = earlier.flatMap((fb) => fb.bullets.filter((b) => isOpen(b) && !isSaved(b)).map((text) => ({ text, date: fb.local_date })));
  const allBullets = new Set((data?.feedback ?? []).flatMap((f) => f.bullets));
  const bookmarked = (data?.items ?? []).filter((i) => i.saved && !i.status && allBullets.has(i.text)).map((i) => i.text);
  const doneItems = (data?.items ?? []).filter((i) => i.status === 'done');
  const skippedItems = (data?.items ?? []).filter((i) => i.status === 'skipped');
  const partner = data?.partner_display_name ?? 'your person';
  const nothing = data && !latest && data.from_partner.length === 0;
  const sheetItem = sheet ? stateOf(sheet.text) : undefined;

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

      {bookmarked.length > 0 && (
        <section aria-labelledby="gg-saved">
          <h2 id="gg-saved" className="sec-h">Saved for later</h2>
          <ul className="pg-list" style={{ marginTop: 'calc(16 * var(--u))' }}>
            {bookmarked.map((t) => <Task key={t} text={t} isNew={false} saved leaving={leaving === t} label="Saved" onResolve={resolve} onSave={(x, on) => void update(x, { saved: on })} />)}
          </ul>
        </section>
      )}

      {latest && (
        <section aria-labelledby="gg-latest-h">
          <div className="lead"><span>Latest · {longDate(latest.local_date)}</span><b id="gg-latest-h">{latest.headline}</b></div>
          {latestOpen.length > 0 ? (
            <ul className="pg-list" style={{ marginTop: 'calc(24 * var(--u))' }}>
              {latestOpen.map((b) => <Task key={b} text={b} isNew={fresh.has(b)} saved={false} leaving={leaving === b} label="Tonight" onResolve={resolve} onSave={(x, on) => void update(x, { saved: on })} />)}
            </ul>
          ) : (
            <p className="caught">{bookmarked.length ? 'The rest of these are saved above, done, or set aside.' : 'All of these are done. Yini will have more for you as you keep logging.'}</p>
          )}
        </section>
      )}

      {stillOpen.length > 0 && (
        <section aria-labelledby="gg-open">
          <h2 id="gg-open" className="sec-h">Still open</h2>
          <ul className="pg-list" style={{ marginTop: 'calc(16 * var(--u))' }}>
            {stillOpen.map((o) => <Task key={o.text} text={o.text} isNew={fresh.has(o.text)} saved={false} leaving={leaving === o.text} label={shortDate(o.date)} onResolve={resolve} onSave={(x, on) => void update(x, { saved: on })} />)}
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

      {doneItems.length > 0 && (
        <section aria-labelledby="gg-done">
          <h2 id="gg-done" className="sec-h">Done <small>{doneItems.length}</small></h2>
          <ul className="pg-list" style={{ marginTop: 'calc(16 * var(--u))' }}>
            {doneItems.map((d) => (
              <li key={d.text} className="sug sug-done">
                <div className="sug-text">
                  {d.outcome && <span className="sug-outcome">{OUTCOME_LABEL[d.outcome]}</span>}
                  <h3>{d.text}</h3>
                  {d.reflection && <p className="sug-note">“{d.reflection}”</p>}
                  <button type="button" className="linkbtn linkbtn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => setSheet({ text: d.text, mode: 'done' })}>{d.outcome ? 'Edit reflection' : 'Reflect'}</button>
                </div>
                <div className="sug-act">
                  <button type="button" className="sug-badge" aria-label={`Done: ${d.text}. Tap to mark as not done.`} onClick={() => void update(d.text, { status: 'open' })}>
                    <CheckIcon />Done
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {skippedItems.length > 0 && (
        <section aria-labelledby="gg-skipped">
          <h2 id="gg-skipped" className="sec-h">Not this time <small>{skippedItems.length}</small></h2>
          <ul className="pg-list" style={{ marginTop: 'calc(16 * var(--u))' }}>
            {skippedItems.map((d) => (
              <li key={d.text} className="sug sug-done">
                <div className="sug-text">
                  {d.outcome && <span className="sug-outcome sug-outcome-quiet">{OUTCOME_LABEL[d.outcome]}</span>}
                  <h3>{d.text}</h3>
                  {d.reflection && <p className="sug-note">“{d.reflection}”</p>}
                  <button type="button" className="linkbtn linkbtn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => setSheet({ text: d.text, mode: 'skipped' })}>{d.outcome ? 'Edit reflection' : 'Reflect'}</button>
                </div>
                <div className="sug-act">
                  <button type="button" className="pill pill-quiet sug-btn" onClick={() => void update(d.text, { status: 'open' })}>Try again</button>
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

      {sheet && (
        <ReflectSheet
          key={sheet.text + sheet.mode}
          text={sheet.text} mode={sheet.mode}
          initialOutcome={sheetItem?.outcome ?? null} initialNote={sheetItem?.reflection ?? ''}
          onSave={(outcome, note) => { void update(sheet.text, { outcome, reflection: note }); setSheet(null); }}
          onClose={() => setSheet(null)}
        />
      )}
    </main>
  );
}

const OUTCOME_LABEL: Record<GrowOutcome, string> = {
  went_well: 'It went well!', okay: 'It was okay', hard: 'It was a little hard',
  no_time: 'Ran out of time', not_right: 'Did not feel right',
};
const DONE_OUTCOMES: GrowOutcome[] = ['went_well', 'okay', 'hard'];
const SKIP_OUTCOMES: GrowOutcome[] = ['no_time', 'not_right', 'hard'];
const SKIP_LABEL: Partial<Record<GrowOutcome, string>> = { no_time: 'I ran out of time', not_right: 'It did not feel right', hard: 'It felt a little hard' };

function Task({ text, isNew, saved, leaving, onResolve, onSave, label }: {
  text: string; isNew: boolean; saved: boolean; leaving: boolean; label: string;
  onResolve: (t: string, status: 'done' | 'skipped') => void; onSave: (t: string, on: boolean) => void;
}) {
  return (
    <li className={`sug${isNew ? ' sug-new' : ''}${saved ? ' sug-saved' : ''}${leaving ? ' sug-leave' : ''}`}>
      <div className="sug-text">
        <div className="sug-top">
          <span className={`sug-cat${isNew ? ' sug-cat-new' : ''}`}>{isNew ? 'New' : label}</span>
          <button type="button" className="sug-mark" aria-pressed={saved} aria-label={saved ? 'Remove from saved' : 'Save for later, at the top'} onClick={() => onSave(text, !saved)}><BookmarkIcon on={saved} /></button>
        </div>
        <h3>{text}</h3>
      </div>
      <div className="sug-act sug-act-col">
        <button type="button" className="pill pill-green sug-btn" aria-label={`Mark as done: ${text}`} onClick={() => onResolve(text, 'done')}>I did it</button>
        <button type="button" className="sug-skip" aria-label={`Not this time: ${text}`} onClick={() => onResolve(text, 'skipped')}>Not this time</button>
      </div>
    </li>
  );
}

/** "How did that little step go?" Pick how it went, add a line only you and Yini see, or skip. */
function ReflectSheet({ text, mode, initialOutcome, initialNote, onSave, onClose }: {
  text: string; mode: 'done' | 'skipped'; initialOutcome: GrowOutcome | null; initialNote: string;
  onSave: (outcome: GrowOutcome, note: string) => void; onClose: () => void;
}) {
  const [outcome, setOutcome] = useState<GrowOutcome | null>(initialOutcome);
  const [note, setNote] = useState(initialNote);
  const skipped = mode === 'skipped';
  const options = skipped ? SKIP_OUTCOMES : DONE_OUTCOMES;
  return (
    <>
      <div className="sheet-scrim" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="reflect-title">
        <div className="sheet-grab" />
        <h2 id="reflect-title">{skipped ? 'That’s okay ♡' : 'How did that little step go? ♡'}</h2>
        <p className="sheet-sub">{skipped ? `What got in the way of: ${text}` : text}</p>
        <div className="opts" role="radiogroup" aria-label={skipped ? 'What got in the way' : 'How it went'}>
          {options.map((o) => (
            <button key={o} type="button" role="radio" aria-checked={outcome === o} className="opt" onClick={() => setOutcome(o)}>
              {skipped ? SKIP_LABEL[o] : OUTCOME_LABEL[o]}
            </button>
          ))}
        </div>
        <label>Anything you’d like Yini to remember?
          <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={600} placeholder="Optional. Only you and Yini see this" />
        </label>
        <button type="button" className="cta-big" disabled={!outcome} onClick={() => outcome && onSave(outcome, note)}>Save reflection</button>
        <button type="button" className="cta-quiet" onClick={onClose}>Skip for now</button>
      </div>
    </>
  );
}
