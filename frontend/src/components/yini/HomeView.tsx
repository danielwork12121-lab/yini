'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { AnimatedPet } from '@/components/pets/AnimatedPet';
import { ReplyCards } from '@/components/ReplyCards';
import { dismissCheckin, retryCheckin, usePendingCheckin } from '@/lib/pendingCheckin';
import { useAppClock } from '@/lib/appClock';

const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Morning' : h < 18 ? 'Afternoon' : 'Evening'; };

/** The temporary home: your cat, a feed button, and the way to the calendar and to telling Yini about your day. */
export function HomeView({ name, partner }: { name: string; partner: string }) {
  const [request, setRequest] = useState(0);
  const [feeding, setFeeding] = useState(false);
  const [fed, setFed] = useState(false);
  const pending = usePendingCheckin();

  // When the app is fast-forwarded to a new day, ask the server to look again: that is what
  // starts the overnight read behind Grow. The first reading of the clock is not a change.
  const router = useRouter();
  const clock = useAppClock();
  const seen = useRef<number | null>(null);
  useEffect(() => {
    if (!clock.loaded) return;
    if (seen.current !== null && seen.current !== clock.offset) router.refresh();
    seen.current = clock.offset;
  }, [clock.loaded, clock.offset, router]);

  function feed() {
    if (feeding) return;
    setFeeding(true);
    setRequest((n) => n + 1);
  }

  return (
    <main className="ypet yhome">
      <h1 className="ypet-title">{greeting()}{name ? `, ${name}` : ''}.</h1>
      <p className="ypet-sub">{fed ? 'Your cat loves it. A little love goes a long way.' : 'Your cat is waiting for you.'}</p>

      {pending.status === 'working' && (
        <div className="yhome-status" role="status" aria-live="polite">
          <span className="yhome-dots" aria-hidden="true"><i /><i /><i /></span>
          Yini is reading your day. Your calendar will update when it is done.
        </div>
      )}
      {pending.status === 'error' && (
        <div className="yhome-status yhome-error" role="alert">
          <p style={{ margin: 0 }}>{pending.message}</p>
          <button type="button" className="ypet-again" onClick={retryCheckin}>Try again</button>
        </div>
      )}
      {pending.status === 'done' && (
        <div className="yhome-done">
          <ReplyCards reply={pending.reply} partner={partner} />
          <div className="yhome-donebar">
            <Link href="/calendar" className="yhome-calink">📅 See it on your calendar</Link>
            <button type="button" className="ypet-again" onClick={dismissCheckin}>Dismiss</button>
          </div>
        </div>
      )}

      <div className="ypet-stage">
        <AnimatedPet
          animation={request ? 'feeding' : 'idle'}
          requestId={request}
          onComplete={() => { setFeeding(false); setFed(true); }}
        />
      </div>

      <button type="button" className="ypet-btn" onClick={feed} disabled={feeding}>
        {feeding ? 'Mmm…' : fed ? 'Feed again ♥' : 'Feed a little love ♥'}
      </button>

      <div className="yhome-links">
        <Link href="/today" className="yhome-btn">🎙 Tell Yini about your day</Link>
        <Link href="/calendar" className="yhome-btn">📅 Calendar</Link>
        <div className="yhome-pair">
          <Link href="/grow" className="yhome-btn yhome-grow">🌱 Grow</Link>
          <Link href="/glow" className="yhome-btn yhome-glow">✨ Glow</Link>
        </div>
      </div>
    </main>
  );
}
