'use client';
import { GlowBig, HeartSmall } from '@/components/app/icons';
import { useEffect, useState } from 'react';
import type { GlowResponse } from '@/contract';
import { fetchJson, HttpError, peekJson } from '@/lib/cachedJson';

const shortDate = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

/**
 * Glow: the kind things your partner has said about you, in their own words. Nothing
 * here is written by Yini. Each line was checked to be a literal slice of what they
 * wrote before it was kept.
 */
export function GlowView() {
  const [data, setData] = useState<GlowResponse | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [tab, setTab] = useState<'notes' | 'things'>('things');

  useEffect(() => {
    let cancelled = false;
    const cached = peekJson<GlowResponse>('/api/glow');
    if (cached) queueMicrotask(() => { if (!cancelled) setData((d) => d ?? cached); }); // last answer first, then the fresh one
    fetchJson<GlowResponse>('/api/glow')
      .then((body) => { if (!cancelled) { setError(''); setData(body); } })
      .catch((e: Error) => {
        if (e instanceof HttpError && e.status === 401) { window.location.assign('/'); return; }
        if (!cancelled) setError(e.message ? `Could not load Glow. ${e.message}` : 'Could not load Glow. Check your connection and try again.');
      });
    return () => { cancelled = true; };
  }, [attempt]);

  const partner = data?.partner_display_name ?? 'your person';
  const things = tab === 'things';

  return (
    <main className="pg">
      <header className="ph">
        <GlowBig />
        <h1>Glow</h1>
      </header>

      <div className="seg" role="tablist" aria-label="Glow categories">
        <button type="button" role="tab" aria-selected={!things} onClick={() => setTab('notes')}>Love Notes</button>
        <button type="button" role="tab" aria-selected={things} onClick={() => setTab('things')}>Little Things</button>
      </div>
      <p className="seg-sub">{things ? `The kind things ${partner} has said about you` : 'Words they wanted you to hear'}</p>

      {things && error && <div className="note note-warn" role="alert"><span>{error}</span><button type="button" className="linkbtn" onClick={() => setAttempt((n) => n + 1)}>Retry</button></div>}
      {things && !data && !error && <div className="note" role="status"><span className="dots" aria-hidden="true"><i /><i /><i /></span>Loading…</div>}

      {things && data && data.compliments.length > 0 && (
        <ul className="pg-list" style={{ marginTop: 'calc(34 * var(--u))' }}>
          {data.compliments.map((c) => (
            <li key={c.id} className={`gcard${c.is_new ? ' gcard-new' : ''}`}>
              <div className="gcard-top">
                <span className="gcard-date">{c.said_on ? shortDate(c.said_on) : 'Recently'}</span>
                {c.is_new && <span className="gcard-pill">New</span>}
              </div>
              <blockquote><p>{c.text}</p></blockquote>
              <span className="gcard-from">— {partner}</span>
            </li>
          ))}
        </ul>
      )}

      {things && data && data.compliments.length === 0 && (
        <div className="empty">
          <HeartSmall /><b>No little things yet</b>
          <span>When {partner} says something kind about you in their log, it shows up here, exactly as they said it.</span>
        </div>
      )}

      {!things && (
        <div className="empty">
          <HeartSmall /><b>Love Notes are coming soon ♡</b>
          <span>Soon you will be able to send each other a little something. For now, Little Things has the kind words already on their way.</span>
        </div>
      )}

      <p className="foot">Only the kind parts cross over. Everything else {partner} writes stays {partner}&apos;s.</p>
    </main>
  );
}
