'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ReplyCards } from '@/components/ReplyCards';
import { dismissCheckin, retryCheckin, usePendingCheckin } from '@/lib/pendingCheckin';
import { AppDateIcon } from '@/components/DateIcon';
import { warmJson } from '@/lib/cachedJson';
import { Room } from '@/components/app/Room';
import { MicBig } from '@/components/app/icons';

const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Morning' : h < 18 ? 'Afternoon' : 'Evening'; };

/** Home: the Check in button, your room and your cat. Feeding and the reply from Yini live here too. */
export function HomeView({ name, partner }: { name: string; partner: string }) {
  const [request, setRequest] = useState(0);
  const [feeding, setFeeding] = useState(false);
  const [fed, setFed] = useState(false);
  const pending = usePendingCheckin();

  // Fill Grow and Glow in the background, so they open already showing something.
  useEffect(() => { warmJson('/api/grow'); warmJson('/api/glow'); }, []);

  function feed() {
    if (feeding) return;
    setFeeding(true);
    setRequest((n) => n + 1);
  }

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

      <Link href="/today" className="checkin" aria-label="Check in: tell Yini about your day">
        <span className="checkin-in">
          <MicBig />
          <span className="checkin-label">Check in</span>
        </span>
      </Link>

      <Room
        request={request}
        onComplete={() => { setFeeding(false); setFed(true); }}
        feed={
          <button type="button" className="pill pill-line" onClick={feed} disabled={feeding}>
            {feeding ? 'Mmm…' : fed ? 'Feed again ♥' : 'Feed a little love ♥'}
          </button>
        }
      />

      {pending.status === 'done' && (
        <>
          <div className="reply"><ReplyCards reply={pending.reply} partner={partner} /></div>
          <div className="reply-bar">
            <Link href="/calendar"><AppDateIcon /> See it on your calendar</Link>
            <button type="button" className="linkbtn" onClick={dismissCheckin}>Dismiss</button>
          </div>
        </>
      )}
    </main>
  );
}
