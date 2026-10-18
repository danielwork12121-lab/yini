'use client';
import { queueFeedOnHome } from '@/lib/pendingCheckin';

/** Open /dev/style?fed=1 to see the feeding animation play, as if you had just sent a check-in. */
export function FeedDemo() {
  if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('fed')) queueFeedOnHome();
  return null;
}
