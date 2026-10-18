'use client';
import { useEffect, useState } from 'react';
import { TimePicker } from './TimePicker';

const KEY = 'yini.notify.prefs';
type Prefs = { checkin: boolean; love: boolean; glow: boolean; grow: boolean; time: string };
const DEFAULTS: Prefs = { checkin: true, love: true, glow: true, grow: true, time: '20:00' };

const ROWS: { key: 'checkin' | 'love' | 'glow' | 'grow'; title: string; sub: string }[] = [
  { key: 'checkin', title: 'Daily check-in reminder', sub: 'One gentle nudge if you haven’t checked in yet.' },
  { key: 'love', title: 'Love Notes', sub: 'When your person sends you a little love.' },
  { key: 'glow', title: 'Unread Glow reminders', sub: 'If sweet things have been waiting a few days.' },
  { key: 'grow', title: 'Grow reminders', sub: 'A soft nudge about a little step you saved.' },
];

const read = (): Prefs => {
  try { return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Prefs>) }; } catch { return DEFAULTS; }
};

/** Notification settings as drawn. Choices are kept on this device; no reminders are sent yet. */
export function NotificationPrefs() {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  useEffect(() => { queueMicrotask(() => setPrefs(read())); }, []);
  const set = (patch: Partial<Prefs>) => setPrefs((p) => {
    const next = { ...p, ...patch };
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* a convenience only */ }
    return next;
  });

  return (
    <>
      {ROWS.map((r) => (
        <div key={r.key} className="toggle-card">
          <div className="toggle-row">
            <div><b>{r.title}</b><small>{r.sub}</small></div>
            <button type="button" role="switch" className="switch" aria-checked={prefs[r.key]} aria-label={r.title} onClick={() => set({ [r.key]: !prefs[r.key] })} />
          </div>
          {r.key === 'checkin' && prefs.checkin && (
            <TimePicker value={prefs.time} onChange={(time) => set({ time })} />
          )}
        </div>
      ))}
      <div className="toggle-card" style={{ background: 'transparent', borderStyle: 'dashed' }}>
        <div className="toggle-row">
          <div><b>Phone notifications</b><small>Yini can send quiet alerts to your phone.</small></div>
          <span className="badge-ok" style={{ background: '#F3E8DC', color: '#7D6D63' }}>Not yet</span>
        </div>
      </div>
      <p className="fineprint">Your notifications list in Yini always works, even with phone notifications off. Reminders never include anything from your journal. Your choices are saved on this device.</p>
    </>
  );
}
