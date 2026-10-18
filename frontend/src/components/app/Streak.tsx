import type { TodayResponse } from '@/contract';

const Flame = () => (
  <svg viewBox="0 0 40 52" aria-hidden="true">
    <path className="flame-out" d="M20 3 C22 14 34 20 34 34 C34 44 28 49 20 49 C12 49 6 44 6 34 C6 28 9 24 12 21 C12 26 14 28 16 28 C14 18 16 9 20 3 Z" />
    <path className="flame-in" d="M20 49 C14 49 12 44 14 39 C15 36 18 34 19 30 C23 34 27 38 26 43 C25 47 23 49 20 49 Z" />
  </svg>
);

/**
 * How many days in a row the two of you have fed Yini, and who has fed today.
 * Feeding is just checking in. The number stays grey until you have both done it today,
 * then it goes hot, like a streak flame.
 */
export function Streak({ today }: { today: TodayResponse }) {
  const you = today.pet.you_fed_today;
  const partner = today.partner_fed_today;
  const both = you && partner;
  const name = today.partner_display_name;
  const note = both ? `You both fed Yini today ♡`
    : you ? `Waiting on ${name}`
    : partner ? `${name} fed Yini. Your turn`
    : 'Check in to feed Yini';
  return (
    <section className="streak" data-hot={both} aria-label={`${today.shared_streak} day streak feeding Yini together`}>
      <div className="streak-row">
        <span className="streak-who" data-fed={you}><i aria-hidden="true">{you ? '✓' : ''}</i>You</span>
        <span className="streak-num"><Flame /><b>{today.shared_streak}</b></span>
        <span className="streak-who" data-fed={partner}><i aria-hidden="true">{partner ? '✓' : ''}</i>{name}</span>
      </div>
      <p className="streak-note">{note}</p>
    </section>
  );
}
