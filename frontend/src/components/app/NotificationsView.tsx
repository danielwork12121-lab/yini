'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { LoveNotesResponse } from '@/contract';
import { fetchJson, peekJson } from '@/lib/cachedJson';
import { HeartToggle } from './icons';

const FILTERS = ['All', 'Check-ins', 'Love', 'Grow'] as const;
const when = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

/**
 * Notifications. Love notes your person sent you show up here (and are the only thing that
 * does yet); reminders and phone alerts are not switched on, so everything else is "all caught up".
 */
export function NotificationsView() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All');
  const [love, setLove] = useState<LoveNotesResponse | null>(null);

  useEffect(() => {
    let live = true;
    const cached = peekJson<LoveNotesResponse>('/api/love');
    queueMicrotask(() => { if (live && cached) setLove((d) => d ?? cached); });
    fetchJson<LoveNotesResponse>('/api/love').then((b) => { if (live) setLove(b); }).catch(() => undefined);
    return () => { live = false; };
  }, []);

  const notes = filter === 'All' || filter === 'Love' ? (love?.received ?? []).slice(0, 20) : [];
  const partner = love?.partner_display_name ?? 'Your person';

  return (
    <main className="pg">
      <header className="ph"><h1 style={{ fontSize: 'max(24px, calc(70 * var(--u)))', marginTop: 'calc(20 * var(--u))' }}>Notifications</h1></header>
      <div className="chips" role="group" aria-label="Filter notifications">
        {FILTERS.map((f) => <button key={f} type="button" className="chip" aria-pressed={filter === f} onClick={() => setFilter(f)}>{f}</button>)}
      </div>
      {notes.length > 0 ? (
        <ul className="inbox">
          {notes.map((n) => (
            <li key={n.id}>
              <Link href="/glow" data-new={n.is_new}>
                <span className="inbox-ic"><HeartToggle on /></span>
                <span className="inbox-body">
                  <b>{partner} sent you a love note</b>
                  <small>{n.voice ? 'A voice note, with the words beside it' : n.title || n.body.slice(0, 60) + (n.body.length > 60 ? '…' : '')}</small>
                </span>
                <span className="inbox-when">{when(n.created_at)}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty" style={{ paddingTop: 'calc(120 * var(--u))' }}>
          <img className="empty-img" src="/yini/buddy-fluffy-cat.png" alt="Your buddy, relaxing" />
          <b>All caught up! ♡</b>
          <span>{filter === 'All' ? 'Nothing new right now. We’ll gently let you know when something is waiting.' : `No ${filter.toLowerCase()} notifications right now.`}</span>
        </div>
      )}
    </main>
  );
}
