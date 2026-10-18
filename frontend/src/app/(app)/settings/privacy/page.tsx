import type { Metadata } from 'next';
import Link from 'next/link';
import { SubPage } from '@/components/app/SubPage';

export const metadata: Metadata = { title: 'Privacy & Memory · Yini' };

export default function PrivacyMemoryPage() {
  return (
    <SubPage title="Privacy & Memory">
      <h2 className="sec-label">How your words are used</h2>
      <div className="card-plain"><h3>Your journal · only you</h3><p>Your entries and recordings are yours alone. Your person can never open them.</p></div>
      <div className="card-plain"><h3>Grow · gentle suggestions</h3><p>Yini uses what it learns to suggest little steps, never quoting anyone’s words.</p></div>
      <div className="card-plain"><h3>Glow · what gets shared</h3><p>Only kind things your person has said about you cross over, in their own words. Everything else stays theirs.</p></div>
      <p className="fineprint"><Link href="/privacy" style={{ color: 'var(--coral-ink)', fontWeight: 800 }}>Read the full privacy policy</Link></p>
    </SubPage>
  );
}
