/** Shown the instant a page is asked for, while its data is on the way. Server-safe, no script. */
export function PageLoading({ label = 'Loading' }: { label?: string }) {
  return (
    <main className="pageload" role="status" aria-live="polite">
      <span className="dots" aria-hidden="true"><i /><i /><i /></span>
      <span>{label}…</span>
    </main>
  );
}
