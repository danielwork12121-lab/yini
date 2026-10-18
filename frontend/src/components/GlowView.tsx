'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { GlowResponse } from '@/contract';

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

  useEffect(() => {
    let cancelled = false;
    fetch('/api/glow', { cache: 'no-store' })
      .then((res) => { if (!res.ok) throw new Error(); return res.json() as Promise<GlowResponse>; })
      .then((body) => { if (!cancelled) { setError(''); setData(body); } })
      .catch(() => { if (!cancelled) setError('Could not load Glow. Check your connection and try again.'); });
    return () => { cancelled = true; };
  }, [attempt]);

  const partner = data?.partner_display_name ?? 'your person';

  return (
    <div className="gg gg-glow">
      <Link href="/home" className="cal-back">← Home</Link>
      <h1 className="display gg-title">Glow <span aria-hidden="true">✨</span></h1>
      <p className="small gg-sub">The kind things {partner} has said about you, in their own words. Yini never rewrites them.</p>

      {error && <p className="small" role="alert" style={{ color: '#9E4A33' }}>{error} <button type="button" className="link" onClick={() => setAttempt((n) => n + 1)}>Retry</button></p>}
      {!data && !error && <p className="caption" style={{ textAlign: 'center' }}>Loading…</p>}

      {data && data.compliments.length > 0 && (
        <ul className="gg-list gg-quotes">
          {data.compliments.map((c) => (
            <li key={c.id} className={`gg-quote${c.is_new ? ' gg-new' : ''}`}>
              {c.is_new && <span className="gg-pill">New</span>}
              <blockquote>
                <p>{c.text}</p>
                <footer>{partner}{c.said_on ? ` · ${shortDate(c.said_on)}` : ''}</footer>
              </blockquote>
            </li>
          ))}
        </ul>
      )}

      {data && data.compliments.length === 0 && (
        <div className="gg-empty">
          <p className="gg-empty-emoji" aria-hidden="true">✨</p>
          <p className="body">No glows yet. When {partner} says something kind about you in their log, it shows up here, exactly as they said it.</p>
        </div>
      )}

      <p className="caption gg-foot">Only the kind parts cross over. Everything else {partner} writes stays {partner}&apos;s.</p>
    </div>
  );
}
