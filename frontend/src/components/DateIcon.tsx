'use client';
import { useAppToday } from '@/lib/appClock';

const monthOf = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { month: 'short' }).toUpperCase();

/** A little tear-off calendar showing a day. The day number flips whenever it changes. */
export function DateTile({ date, large = false }: { date: string; large?: boolean }) {
  return (
    <span className={`dateicon${large ? ' dateicon-lg' : ''}`} aria-hidden="true">
      <span className="dateicon-m">{monthOf(date)}</span>
      <span className="dateicon-d" key={date}>{Number(date.slice(8))}</span>
    </span>
  );
}

/** The calendar icon for the app's own "today": it moves from 17 to 18 to 19 as days pass. */
export function AppDateIcon() {
  const today = useAppToday();
  return today ? <DateTile date={today} /> : <span aria-hidden="true">📅</span>;
}
