'use client';
import { useEffect, useRef, useState } from 'react';
import { GlowBig, HeartSmall, HeartToggle, PauseIcon, PlayIcon, PlusIcon } from '@/components/app/icons';
import type { GlowResponse, LoveNotesResponse, LoveNoteView } from '@/contract';
import { fetchJson, HttpError, peekJson, putJson } from '@/lib/cachedJson';
import { LoveComposer, LOVE_DRAFT_KEY } from '@/components/love/LoveComposer';
import { clock } from '@/components/love/useVoiceNote';

const shortDate = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const isoDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const CLAMP = 150;
const LOVE = '/api/love';

type Filter = 'all' | 'fav' | 'sent';

/**
 * Glow. Love Notes are words your person chose to send you (typed, or spoken with the words
 * beside them); you can favorite them, and look back at what you sent. Little Things are the
 * kind words they said about you in their own log, in their own words. Yini writes neither.
 */
export function GlowView() {
  const [things, setThings] = useState<GlowResponse | null>(null);
  const [love, setLove] = useState<LoveNotesResponse | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [tab, setTab] = useState<'notes' | 'things'>('notes');
  const [filter, setFilter] = useState<Filter>('all');
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState('');
  const [toast, setToast] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // A "tell them" from Grow arrives as a draft: open the composer with it ready.
  useEffect(() => {
    try {
      const d = sessionStorage.getItem(LOVE_DRAFT_KEY);
      if (d) { sessionStorage.removeItem(LOVE_DRAFT_KEY); queueMicrotask(() => { setDraft(d); setComposing(true); }); }
    } catch { /* a convenience only */ }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const cachedThings = peekJson<GlowResponse>('/api/glow');
    const cachedLove = peekJson<LoveNotesResponse>(LOVE);
    queueMicrotask(() => { // last answers first, then the fresh ones
      if (cancelled) return;
      if (cachedThings) setThings((d) => d ?? cachedThings);
      if (cachedLove) setLove((d) => d ?? cachedLove);
    });
    const fail = (e: Error) => {
      if (e instanceof HttpError && e.status === 401) { window.location.assign('/'); return; }
      if (!cancelled) setError(e.message ? `Could not load Glow. ${e.message}` : 'Could not load Glow. Check your connection and try again.');
    };
    fetchJson<GlowResponse>('/api/glow').then((b) => { if (!cancelled) { setError(''); setThings(b); } }).catch(fail);
    fetchJson<LoveNotesResponse>(LOVE).then((b) => { if (!cancelled) setLove(b); }).catch(() => undefined); // notes are extra: Glow still opens without them
    return () => { cancelled = true; };
  }, [attempt]);

  const partner = love?.partner_display_name ?? things?.partner_display_name ?? 'your person';
  const notes = tab === 'notes';

  const list: { note: LoveNoteView; sent: boolean }[] = (() => {
    if (!love) return [];
    const got = love.received.map((note) => ({ note, sent: false }));
    const mine = love.sent.map((note) => ({ note, sent: true }));
    const pool = filter === 'sent' ? mine : filter === 'fav' ? got.filter((x) => x.note.is_favorite) : got;
    return pool.slice().sort((a, b) => (a.note.created_at < b.note.created_at ? 1 : -1));
  })();

  async function favorite(id: string, on: boolean) {
    const before = love;
    const apply = (next: LoveNotesResponse) => { setLove(next); putJson(LOVE, next); };
    if (before) apply({ ...before, received: before.received.map((n) => (n.id === id ? { ...n, is_favorite: on } : n)) });
    try {
      const res = await fetch('/api/love/favorite', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, favorite: on }) });
      if (!res.ok) throw new Error();
    } catch {
      if (before) apply(before);
    }
  }

  function sent(note: LoveNoteView) {
    setLove((d) => {
      const next = d ? { ...d, sent: [note, ...d.sent] } : { partner_display_name: partner, received: [], sent: [note] };
      putJson(LOVE, next);
      return next;
    });
    setToast(true);
    setTimeout(() => setToast(false), 2600);
  }

  const emptyCopy = filter === 'fav' ? ['No favorites yet ♡', 'Tap ♡ on anything you’d like to keep close.']
    : filter === 'sent' ? ['Nothing sent yet ♡', 'Write a little note whenever you feel it.']
    : ['A little love is on its way ♡', `Sweet words from ${partner} will find a home here.`];

  return (
    <main className="pg">
      <header className="ph">
        <GlowBig />
        <h1>Glow</h1>
      </header>

      <div className="seg" role="tablist" aria-label="Glow categories">
        <button type="button" role="tab" aria-selected={notes} onClick={() => { setTab('notes'); setFilter('all'); }}>Love Notes</button>
        <button type="button" role="tab" aria-selected={!notes} onClick={() => setTab('things')}>Little Things</button>
      </div>
      <p className="seg-sub">{notes ? 'Words they wanted you to hear' : `The kind things ${partner} has said about you`}</p>

      {notes && (
        <div className="glow-row">
          {([['all', 'All notes'], ['fav', 'Favorites'], ['sent', 'Sent by me']] as [Filter, string][]).map(([k, label]) => (
            <button key={k} type="button" className="chip" aria-pressed={filter === k} onClick={() => setFilter(k)}>{label}</button>
          ))}
          <button type="button" className="write-btn" onClick={() => setComposing(true)}><PlusIcon />Write a Note</button>
        </div>
      )}

      {notes && !love && !error && <div className="note" role="status"><span className="dots" aria-hidden="true"><i /><i /><i /></span>Loading…</div>}

      {notes && love && list.length > 0 && (
        <ul className="pg-list" style={{ marginTop: 'calc(30 * var(--u))' }}>
          {list.map(({ note, sent: mine }) => (
            <NoteCard key={note.id} note={note} sent={mine} open={!!expanded[note.id]}
              onToggle={() => setExpanded((x) => ({ ...x, [note.id]: !x[note.id] }))}
              onFav={() => void favorite(note.id, !note.is_favorite)} />
          ))}
        </ul>
      )}

      {notes && love && list.length === 0 && (
        <div className="empty"><HeartSmall /><b>{emptyCopy[0]}</b><span>{emptyCopy[1]}</span></div>
      )}

      {!notes && error && <div className="note note-warn" role="alert"><span>{error}</span><button type="button" className="linkbtn" onClick={() => setAttempt((n) => n + 1)}>Retry</button></div>}
      {!notes && !things && !error && <div className="note" role="status"><span className="dots" aria-hidden="true"><i /><i /><i /></span>Loading…</div>}

      {!notes && things && things.compliments.length > 0 && (
        <ul className="pg-list" style={{ marginTop: 'calc(34 * var(--u))' }}>
          {things.compliments.map((c) => (
            <li key={c.id} className={`gcard${c.is_new ? ' gcard-new' : ''}`}>
              <div className="gcard-top">
                <span className="gcard-date">{c.said_on ? shortDate(c.said_on) : 'Recently'}</span>
                {c.is_new && <span className="gcard-pill">New</span>}
              </div>
              <blockquote><p>{c.text}</p></blockquote>
              <span className="gcard-from">— {partner}</span>
            </li>
          ))}
        </ul>
      )}

      {!notes && things && things.compliments.length === 0 && (
        <div className="empty">
          <HeartSmall /><b>Good things take time ♡</b>
          <span>When {partner} says something kind about you in their log, it shows up here, exactly as they said it.</span>
        </div>
      )}

      <p className="foot">{notes ? `Notes are only ever what ${partner} chose to send you.` : `Only the kind parts cross over. Everything else ${partner} writes stays ${partner}’s.`}</p>

      {toast && <div className="toast" role="status">Your note is on its way ♡</div>}
      {composing && <LoveComposer partner={partner} initialText={draft} onClose={() => { setComposing(false); setDraft(''); }} onSent={(r) => sent(r.note)} />}
    </main>
  );
}

function NoteCard({ note, sent, open, onToggle, onFav }: { note: LoveNoteView; sent: boolean; open: boolean; onToggle: () => void; onFav: () => void }) {
  const long = note.body.length > CLAMP;
  const shown = long && !open ? `${note.body.slice(0, CLAMP).replace(/\s+\S*$/, '')}…` : note.body;
  return (
    <li className={`ncard${note.is_new ? ' ncard-new' : ''}`}>
      <div className="ncard-top">
        <span className="ncard-date">{sent ? 'Sent ' : ''}{isoDate(note.created_at)}</span>
        {note.is_new && <span className="gcard-pill">New</span>}
        {!sent && (
          <button type="button" className="ncard-fav" aria-pressed={note.is_favorite} aria-label={note.is_favorite ? 'Remove from favorites' : 'Add to favorites'} onClick={onFav}>
            <HeartToggle on={note.is_favorite} />
          </button>
        )}
      </div>
      {note.title && <h3>{note.title}</h3>}
      {note.voice && <VoicePlayer url={note.voice.url} ms={note.voice.duration_ms} />}
      {note.voice && note.body && <span className="ncard-tr">TRANSCRIPT</span>}
      {note.body && <p>{shown}</p>}
      {long && <button type="button" className="linkbtn" aria-expanded={open} onClick={onToggle}>{open ? 'Show less' : 'Read more'}</button>}
    </li>
  );
}

function VoicePlayer({ url, ms }: { url: string; ms: number }) {
  const el = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  return (
    <div className="love-player" data-playing={playing}>
      <button type="button" className="love-play" aria-label={playing ? 'Pause voice note' : 'Play voice note'} aria-pressed={playing}
        onClick={() => { const a = el.current; if (!a) return; if (a.paused) void a.play(); else a.pause(); }}>
        {playing ? <PauseIcon /> : <PlayIcon />}
      </button>
      <span className="love-wave" aria-hidden="true" />
      <span className="love-dur">{clock(ms)}</span>
      <audio ref={el} src={url} preload="none" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} />
    </div>
  );
}
