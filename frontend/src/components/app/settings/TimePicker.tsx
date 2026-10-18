'use client';
import { useState } from 'react';
import { ChevronDownIcon } from '../icons';

const MINUTES = [0, 15, 30, 45];
const pad = (n: number) => String(n).padStart(2, '0');

/** "20:00" → "8:00 PM". */
export function formatTime(t: string): string {
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${pad(m || 0)} ${h >= 12 ? 'PM' : 'AM'}`;
}

/**
 * The "Remind me at" row. Tapping it opens soft pills for the hour, the minute and AM / PM,
 * in the app's own colours, in place of the browser's plain time wheel. The value stays "HH:MM".
 */
export function TimePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [h24, m] = value.split(':').map(Number);
  const pm = h24 >= 12;
  const h12 = h24 % 12 || 12;
  const put = (hour12: number, minute: number, isPm: boolean) => onChange(`${pad((hour12 % 12) + (isPm ? 12 : 0))}:${pad(minute)}`);

  return (
    <>
      <button type="button" className="remind" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        Remind me at
        <span className="remind-val">{formatTime(value)}<ChevronDownIcon /></span>
      </button>
      {open && (
        <div className="tp" role="group" aria-label="Reminder time">
          <p className="tp-label">Hour</p>
          <div className="tp-hours">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
              <button key={h} type="button" className="tp-opt" aria-pressed={h === h12} onClick={() => put(h, m, pm)}>{h}</button>
            ))}
          </div>
          <p className="tp-label">Minute</p>
          <div className="tp-mins">
            {MINUTES.map((mm) => (
              <button key={mm} type="button" className="tp-opt" aria-pressed={mm === m} onClick={() => put(h12, mm, pm)}>:{pad(mm)}</button>
            ))}
          </div>
          <div className="tp-ampm">
            <button type="button" className="tp-opt" aria-pressed={!pm} onClick={() => put(h12, m, false)}>AM</button>
            <button type="button" className="tp-opt" aria-pressed={pm} onClick={() => put(h12, m, true)}>PM</button>
          </div>
          <button type="button" className="tp-done" onClick={() => setOpen(false)}>Done</button>
        </div>
      )}
    </>
  );
}
