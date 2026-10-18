'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { TodayResponse } from '@/contract';
import { CheckIn } from '@/components/CheckIn';
import { HttpError, fetchJson, peekJson } from '@/lib/cachedJson';

const URL = '/api/today';

/** Shows the check-in card straight away, then fills in who you are and how the cat is. */
export function CheckInPage() {
  const router = useRouter();
  const [today, setToday] = useState<TodayResponse | null>(null);

  useEffect(() => {
    // Whatever Home already fetched shows at once; a fresh copy replaces it quietly.
    queueMicrotask(() => { const seen = peekJson<TodayResponse>(URL); if (seen) setToday(seen); });
    let live = true;
    fetchJson<TodayResponse>(URL)
      .then((t) => { if (live) setToday(t); })
      .catch((e) => {
        if (!(e instanceof HttpError)) return; // offline: the mic still works
        if (e.status === 401) router.replace('/');
        else if (e.status === 400) router.replace('/pair');
      });
    return () => { live = false; };
  }, [router]);

  return <CheckIn today={today} />;
}
