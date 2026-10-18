'use client';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ReplyCards } from '@/components/ReplyCards';
import { retryCheckin, usePendingCheckin } from '@/lib/pendingCheckin';
import { fetchJson, peekJson, warmJson } from '@/lib/cachedJson';
import { Streak } from '@/components/app/Streak';
import type { TodayResponse } from '@/contract';
import { Room } from '@/components/app/Room';
import { MicBig } from '@/components/app/icons';

const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Morning' : h < 18 ? 'Afternoon' : 'Evening'; };

/** Home: the Check in button, your room and your cat. Feeding and the reply from Yini live here too. */
export function HomeView({ name }: { name: string; partner: string }) {
  const [request, setRequest] = useState(0);
  const [action, setAction] = useState<'feeding' | 'happy'>('feeding');
  const [today, setToday] = useState<TodayResponse | null>(null);
  const pending = usePendingCheckin();
  const wasDone = useRef(pending.status === 'done');

  // Fill Grow and Glow in the background, so they open already showing something.
  useEffect(() => { warmJson('/api/grow'); warmJson('/api/glow'); warmJson('/api/love'); }, []);

  // The streak and who has fed today. Show the last answer at once, then ask again.
  const refresh = useCallback(async () => {
    try { return await fetchJson<TodayResponse>('/api/today'); } catch { return null; }
  }, []);
  useEffect(() => {
    let cancelled = false;
    const cached = peekJson<TodayResponse>('/api/today');
    if (cached) queueMicrotask(() => { if (!cancelled) setToday(cached); });
    void refresh().then((t) => {
      if (cancelled || !t) return;
      setToday(t);
      // Both of you fed today: Yini is a little happier, once per visit to the app each day.
      const key = `yini.happy.${t.local_date}`;
      let seen = false;
      try { seen = sessionStorage.getItem(key) === '1'; if (t.pet.both_fed_today) sessionStorage.setItem(key, '1'); } catch { /* a flourish only */ }
      if (t.pet.both_fed_today && !seen) { setAction('happy'); setRequest((n) => n + 1); }
    });
    return () => { cancelled = true; };
  }, [refresh]);

  // Logging your day feeds Yini. When the reply lands, the cat eats and the streak catches up.
  useEffect(() => {
    const done = pending.status === 'done';
    if (done && !wasDone.current) {
      setAction('feeding'); setRequest((n) => n + 1);
      void refresh().then((t) => { if (t) setToday(t); });
    }
    wasDone.current = done;
  }, [pending.status, refresh]);

  return (
    <main>
      <h1 className="sr-only">{greeting()}{name ? `, ${name}` : ''}.</h1>

      {pending.status === 'working' && (
        <div className="pg"><div className="note" role="status" aria-live="polite">
          <span className="dots" aria-hidden="true"><i /><i /><i /></span>
          Yini is reading your day. Your calendar will update when it is done.
        </div></div>
      )}
      {pending.status === 'error' && (
        <div className="pg"><div className="note note-warn" role="alert">
          <span>{pending.message}</span>
          <button type="button" className="linkbtn" onClick={retryCheckin}>Try again</button>
        </div></div>
      )}

      <Link href="/today" prefetch className="checkin" aria-label="Check in: tell Yini about your day">
        <span className="checkin-in">
          <MicBig />
          <span className="checkin-label">Check in</span>
        </span>
      </Link>

      <Room request={request} action={action} happy={!!today?.pet.both_fed_today} />
      {today && <Streak today={today} />}

      {pending.status === 'done' && (
        <div className="reply"><ReplyCards reply={pending.reply} /></div>
      )}
    </main>
  );
}
