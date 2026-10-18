/**
 * When should Yini read a day? Pure, so it is tested without a database.
 *
 *   no run yet                         → run
 *   running, and started recently      → wait (someone else is already on it)
 *   running, but older than STALE_MS   → run (that function died)
 *   done or skipped                    → settled, unless something was written after it
 *                                        finished: then run again, so Grow keeps up with the day
 *   failed less than COOLDOWN_MS ago   → settled for now (do not hammer a broken model)
 *   failed longer ago                  → run again
 */
export type OvernightDecision = 'run' | 'wait' | 'settled';

export const STALE_MS = 15 * 60_000;
export const COOLDOWN_MS = 3 * 60_000;

export function overnightDecision(
  run: { status: 'running' | 'done' | 'skipped' | 'failed'; started_at: string; finished_at?: string | null } | null,
  now: number = Date.now(),
  /** When the newest entry for that day was saved, if any. */
  latestEntryAt: string | null = null,
): OvernightDecision {
  if (!run) return 'run';
  const age = now - Date.parse(run.started_at);
  switch (run.status) {
    case 'done':
    case 'skipped': {
      const readAt = Date.parse(run.finished_at ?? run.started_at);
      return latestEntryAt && Date.parse(latestEntryAt) > readAt ? 'run' : 'settled';
    }
    case 'running': return age > STALE_MS ? 'run' : 'wait';
    case 'failed': return age < COOLDOWN_MS ? 'settled' : 'run';
  }
}
