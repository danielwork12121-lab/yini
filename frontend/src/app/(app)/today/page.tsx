import type { Metadata } from 'next';
import { CheckInPage } from '@/components/CheckInPage';

export const metadata: Metadata = { title: 'Check in · Yini' };

/**
 * Nothing here waits on the server: the page is the same for everyone, so it can be sent
 * ahead of time and opens the moment Check in is tapped. The little bits about you (your
 * name, the cat's line at the bottom) fill in a beat later; the mic never waits for them.
 * Signed-out or not-yet-paired people are sent on by CheckInPage once the API says so.
 */
export default function TodayPage() {
  return <CheckInPage />;
}
