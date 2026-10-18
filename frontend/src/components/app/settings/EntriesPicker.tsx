'use client';
import { useEffect, useState } from 'react';
import type { EntriesResponse } from '@/contract';
import { CheckIcon } from '@/components/app/icons';

const when = (iso: string) => new Date(iso).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

/**
 * Delete Entries as drawn: your entries with a tick box each and a Delete button. Removing
 * entries is not switched on in the app yet, so the button stays off and says why.
 */
export function EntriesPicker() {
  const [entries, setEntries] = useState<EntriesResponse['entries'] | null>(null);
  const [error, setError] = useState('');
  const [picked, setPicked] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    fetch('/api/entries?limit=40', { cache: 'no-store' })
      .then((r) => { if (!r.ok) throw new Error(); return r.json() as Promise<EntriesResponse>; })
      .then((b) => { if (!cancelled) setEntries(b.entries); })
      .catch(() => { if (!cancelled) setError('Could not load your entries.'); });
    return () => { cancelled = true; };
  }, []);

  const toggle = (id: string) => setPicked((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <>
      {error && <div className="note note-warn" role="alert"><span>{error}</span></div>}
      {!entries && !error && <div className="note" role="status"><span className="dots" aria-hidden="true"><i /><i /><i /></span>Loading…</div>}
      {entries && entries.length === 0 && <div className="empty"><b>No entries yet</b><span>When you check in, your entries show up here.</span></div>}
      {entries?.map((e) => (
        <button key={e.id} type="button" className="entry-pick" aria-pressed={picked.has(e.id)} onClick={() => toggle(e.id)}>
          <span className="box" aria-hidden="true">{picked.has(e.id) && <span style={{ width: '70%', display: 'flex' }}><CheckIcon /></span>}</span>
          <span>
            <small>{when(e.created_at)}</small>
            <span className="t">{e.text.length > 160 ? `${e.text.slice(0, 160).replace(/\s+\S*$/, '')}…` : e.text}</span>
            {e.input_mode === 'voice' && <em>Includes a voice recording</em>}
          </span>
        </button>
      ))}
      <div className="sub-foot">
        <button type="button" className="cta" disabled>Delete Entry</button>
        <p className="fineprint" style={{ margin: 0 }}>Removing entries is not switched on yet.</p>
      </div>
    </>
  );
}
