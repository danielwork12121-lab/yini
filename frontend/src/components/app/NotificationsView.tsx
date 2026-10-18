'use client';
import { useState } from 'react';

const FILTERS = ['All', 'Check-ins', 'Love', 'Grow'] as const;

/**
 * Notifications as drawn. Nothing in the app sends notifications yet, so the list is always
 * the "all caught up" state; the filters are here so the page looks and behaves as designed.
 */
export function NotificationsView() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All');
  return (
    <main className="pg">
      <header className="ph"><h1 style={{ fontSize: 'max(24px, calc(70 * var(--u)))', marginTop: 'calc(20 * var(--u))' }}>Notifications</h1></header>
      <div className="chips" role="group" aria-label="Filter notifications">
        {FILTERS.map((f) => <button key={f} type="button" className="chip" aria-pressed={filter === f} onClick={() => setFilter(f)}>{f}</button>)}
      </div>
      <div className="empty" style={{ paddingTop: 'calc(120 * var(--u))' }}>
        <img className="empty-img" src="/yini/buddy-fluffy-cat.png" alt="Your buddy, relaxing" />
        <b>All caught up! ♡</b>
        <span>{filter === 'All' ? 'Nothing new right now. We’ll gently let you know when something is waiting.' : `No ${filter.toLowerCase()} notifications right now.`}</span>
      </div>
    </main>
  );
}
