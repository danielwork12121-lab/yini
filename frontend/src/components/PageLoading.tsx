/** Shown the instant a page is asked for, while its data is on the way. Server-safe, no script. */
export function PageLoading({ label = 'Loading' }: { label?: string }) {
  return (
    <main className="phone pageload" role="status" aria-live="polite">
      <span className="yhome-dots" aria-hidden="true"><i /><i /><i /></span>
      <span className="caption">{label}…</span>
    </main>
  );
}
