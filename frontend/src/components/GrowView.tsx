'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { DailyFeedbackView, GrowResponse } from '@/contract';

/** Dates are built at noon so a timezone never nudges them onto a neighbouring day. */
const longDate = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
const shortDate = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

const POLL_MS = 3000;

/**
 * Grow: small things you could do for the two of you. Yini works them out overnight
 * from what you have both been logging, and never shows what anyone actually wrote.
 */
export function GrowView() {
  const [data, setData] = useState<GrowResponse | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const working = data?.status === 'working';

  // Loads once, then keeps asking every few seconds for as long as a day is still being read.
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const load = async () => {
      try {
        const res = await fetch('/api/grow', { cache: 'no-store' });
        if (!res.ok) throw new Error();
        const body = (await res.json()) as GrowResponse;
        if (cancelled) return;
        setError('');
        setData(body);
        if (body.status === 'working') timer = setTimeout(load, POLL_MS);
      } catch {
        if (!cancelled) setError('Could not load Grow. Check your connection and try again.');
      }
    };
    void load();
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, [attempt]);

  const [latest, ...earlier] = data?.feedback ?? [];
  const partner = data?.partner_display_name ?? 'your person';
  const nothing = data && !latest && data.from_partner.length === 0;

  return (
    <div className="gg gg-grow">
      <Link href="/home" className="cal-back">← Home</Link>
      <h1 className="display gg-title">Grow <span aria-hidden="true">🌱</span></h1>
      <p className="small gg-sub">Small things you could do for the two of you. Yini works them out overnight from what you have both been logging, and never shows what anyone wrote.</p>

      {error && <p className="small" role="alert" style={{ color: '#9E4A33' }}>{error} <button type="button" className="link" onClick={() => setAttempt((n) => n + 1)}>Retry</button></p>}
      {!data && !error && <p className="caption" style={{ textAlign: 'center' }}>Loading…</p>}

      {working && (
        <div className="gg-note" role="status" aria-live="polite">
          <span className="yhome-dots" aria-hidden="true"><i /><i /><i /></span>
          Yini is reading your latest day. This takes under a minute.
        </div>
      )}
      {data?.status === 'failed' && (
        <div className="gg-note gg-note-warn" role="status">
          <span>Last night&apos;s read did not go through. It will try again in a few minutes.</span>
          <button type="button" className="link" onClick={() => setAttempt((n) => n + 1)}>Check again</button>
        </div>
      )}

      {latest && <LatestCard fb={latest} />}

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

      {earlier.length > 0 && (
        <section className="gg-section" aria-labelledby="gg-earlier">
          <h2 id="gg-earlier" className="gg-h">Earlier</h2>
          {earlier.map((fb) => (
            <details key={fb.id} className="gg-earlier">
              <summary><span>{longDate(fb.local_date)}</span><em>{fb.headline}</em></summary>
              <ul className="gg-list">{fb.bullets.map((b, i) => <li key={i} className="gg-item"><p className="body gg-text">{b}</p></li>)}</ul>
            </details>
          ))}
        </section>
      )}

      {data?.status === 'empty' && (
        <div className="gg-empty">
          <p className="gg-empty-emoji" aria-hidden="true">🌱</p>
          <p className="body">Nothing to grow from yet. Tell Yini about your day, and your first Grow arrives the next morning.</p>
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

function LatestCard({ fb }: { fb: DailyFeedbackView }) {
  return (
    <section className="gg-latest" aria-labelledby="gg-latest-h">
      <p className="caption gg-kicker">Latest · {longDate(fb.local_date)}</p>
      <h2 id="gg-latest-h" className="display gg-headline">{fb.headline}</h2>
      <ul className="gg-list">
        {fb.bullets.map((b, i) => (
          <li key={i} className="gg-item"><span className="gg-sprout" aria-hidden="true">🌿</span><p className="body gg-text">{b}</p></li>
        ))}
      </ul>
    </section>
  );
}
