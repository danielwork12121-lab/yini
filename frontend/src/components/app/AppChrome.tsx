'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HandDrawnDefs } from './HandDrawn';
import { BellIcon, CalendarTabIcon, GearIcon, GlowTabIcon, GrowTabIcon, HomeTabIcon } from './icons';

const TABS = [
  { href: '/home', label: 'Home', match: ['/home', '/today'], icon: <HomeTabIcon /> },
  { href: '/grow', label: 'Grow', match: ['/grow'], icon: <GrowTabIcon /> },
  { href: '/glow', label: 'Glow', match: ['/glow'], icon: <GlowTabIcon /> },
  { href: '/calendar', label: 'Calendar', match: ['/calendar'], icon: <CalendarTabIcon /> },
];

/**
 * The frame around every signed-in screen: logo and the two round buttons on top, the four
 * tabs along the bottom. It lives in a layout, so it stays put while the page inside changes.
 * Settings pages draw their own back arrow and title instead of the logo.
 */
export function AppChrome({ children }: { children: React.ReactNode }) {
  const path = usePathname() ?? '';
  const inSettings = path.startsWith('/settings');
  const hub = path === '/settings' || path === '/settings/notifications';
  const showHeader = !inSettings;
  const showTabs = !inSettings || hub;
  const inbox = path === '/notifications';

  return (
    <div className="app">
      <HandDrawnDefs />
      {showHeader && (
        <header className="ah">
          <Link href="/home" aria-label="Yini home"><img className="ah-logo" src="/yini/signin-logo.png" alt="yini" /></Link>
          <div className="ah-btns">
            {!inbox && <Link className="ah-btn" href="/notifications" aria-label="Notifications" prefetch><BellIcon /></Link>}
            <Link className="ah-btn" href={inbox ? '/settings/notifications' : '/settings'} aria-label={inbox ? 'Notification settings' : 'Settings'} prefetch><GearIcon /></Link>
          </div>
        </header>
      )}
      <div className="app-main" data-tabs={showTabs} data-header={showHeader}>{children}</div>
      {showTabs && (
        <nav className="tabs" aria-label="Main">
          <div className="tabs-in">
            {TABS.map((t) => (
              <Link key={t.href} href={t.href} prefetch className="tab" aria-current={t.match.includes(path) ? 'page' : undefined}>
                {t.icon}{t.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}
