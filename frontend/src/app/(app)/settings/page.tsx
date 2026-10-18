import Link from 'next/link';
import type { Metadata } from 'next';
import { SubPage } from '@/components/app/SubPage';
import { BookIcon, ChatIcon, HeartSmall, LockIcon, PawIcon, PersonIcon, RowChev, ShieldIcon, TrashIcon } from '@/components/app/icons';

export const metadata: Metadata = { title: 'Settings · Yini' };

const Row = ({ href, bg, icon, title, sub, danger }: { href: string; bg: string; icon: React.ReactNode; title: string; sub: string; danger?: boolean }) => (
  <Link className={`srow${danger ? ' srow-danger' : ''}`} href={href}>
    <span className="sico" style={{ background: bg }}>{icon}</span>
    <span><b>{title}</b><small>{sub}</small></span>
    <RowChev />
  </Link>
);

export default function SettingsPage() {
  return (
    <SubPage title="Settings" back="/home">
      <h2 className="sec-label">You &amp; your person</h2>
      <nav className="group" aria-label="You and your person">
        <Row href="/settings/profile" bg="#FBE6DC" icon={<PersonIcon />} title="My Profile" sub="Your name and photo" />
        <Row href="/settings/connected" bg="#FBE6DC" icon={<HeartSmall />} title="Connected Person" sub="Who you’re linked with" />
        <Row href="/settings/buddy" bg="#FCEBD3" icon={<PawIcon />} title="Our Little Buddy" sub="Change your shared pet" />
      </nav>
      <h2 className="sec-label">Privacy &amp; security</h2>
      <nav className="group" aria-label="Privacy and security">
        <Row href="/settings/privacy" bg="#E7EDDA" icon={<LockIcon />} title="Privacy & Memory" sub="What Yini remembers and shares" />
        <Row href="/settings/entries" bg="#E7EDDA" icon={<BookIcon />} title="Delete Entries" sub="Remove journal entries" />
        <Row href="/settings/account" bg="#E7EDDA" icon={<ShieldIcon />} title="Account & Security" sub="Email, sign-in and log out" />
        <Row href="/settings/delete-account" bg="#FBE6DC" icon={<TrashIcon />} title="Delete Account" sub="Permanently remove your account" danger />
      </nav>
      <h2 className="sec-label">Support</h2>
      <nav className="group" aria-label="Support">
        <Row href="/settings/help" bg="#FCEBD3" icon={<ChatIcon />} title="Help & Feedback" sub="Report a bug or share an idea" />
      </nav>
    </SubPage>
  );
}
