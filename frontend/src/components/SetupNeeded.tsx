/** First-run screen when .env.local has not been filled in yet. */
export function SetupNeeded() {
  return (
    <main className="phone" style={{ paddingTop: 60 }}>
      <p className="display h1">Almost there</p>
      <p className="body" style={{ color: 'var(--ink-muted)' }}>
        Supabase is not configured yet, so there is nowhere to save an entry.
      </p>
      <div className="card" style={{ marginTop: 16 }}>
        <p className="small" style={{ marginTop: 0 }}>
          Copy <code>.env.example</code> to <code>.env.local</code> and fill in the three Supabase
          values, then run the migration in <code>supabase/migrations/0001_init.sql</code>.
        </p>
        <p className="small" style={{ marginBottom: 0 }}>
          No model key is needed to try the loop — it falls back to a built-in mock.
        </p>
      </div>
    </main>
  );
}
