'use client';
import { useCallback, useEffect, useState } from 'react';
import type { DailyFeedbackView, FeedbackLatestResponse } from '@/contract';
import { createClient } from '@/lib/supabase/client';

/**
 * Last night's feedback from the nightly agent.
 *
 * Live: subscribes to Supabase Realtime on daily_feedback. Realtime applies the
 * table's RLS, so this only ever hears about rows written for the signed-in user —
 * the same guarantee the Python backend's SSE stream gave, without a long-lived server.
 */
export function DailyFeedback({ demo }: { demo: boolean }) {
  const [feedback, setFeedback] = useState<DailyFeedbackView | null>(null);
  const [running, setRunning] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch('/api/feedback/latest', { cache: 'no-store' });
    if (res.ok) setFeedback(((await res.json()) as FeedbackLatestResponse).feedback);
  }, []);

  useEffect(() => {
    // Fetch on mount; the subscription below handles every later change.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    const supabase = createClient();
    const channel = supabase.channel('daily-feedback')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_feedback' }, () => { void load(); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [load]);

  async function runNow() {
    setRunning(true);
    await fetch('/api/feedback/run', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    await load();
    setRunning(false);
  }

  if (!feedback && !demo) return null;

  return (
    <div className="card" style={{ marginTop: 14 }}>
      <p className="caption" style={{ marginTop: 0, textTransform: 'uppercase', letterSpacing: '.06em' }}>
        {feedback ? `Overnight · ${feedback.local_date}` : 'Overnight'}
      </p>
      {feedback ? (
        <>
          <p className="body" style={{ marginTop: 0 }}>{feedback.headline}</p>
          <ul className="body" style={{ margin: 0, paddingLeft: 18, color: 'var(--ink-muted)' }}>
            {feedback.bullets.map((b, i) => <li key={i} style={{ marginBottom: 6 }}>{b}</li>)}
          </ul>
        </>
      ) : (
        <p className="body" style={{ margin: 0, color: 'var(--ink-muted)' }}>
          After you both write, tonight&apos;s reflection lands here.
        </p>
      )}
      {demo && (
        <button className="link" style={{ marginTop: 10 }} disabled={running} onClick={runNow}>
          {running ? 'Reading both days…' : "Demo: run tonight's reflection now"}
        </button>
      )}
    </div>
  );
}
