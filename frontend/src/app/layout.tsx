import type { Metadata, Viewport } from 'next';
import { Fraunces, Figtree, Nunito } from 'next/font/google';
import './globals.css';
import { DayWatcher } from '@/components/DayWatcher';

// Fraunces is variable: SOFT rounds the terminals and WONK adds a deliberate
// wobble. Declaring `axes` means weight must stay variable, not a fixed list.
const display = Fraunces({
  subsets: ['latin'], variable: '--font-display', axes: ['SOFT', 'WONK'],
});
// Nunito is the typeface of the Yini art boards.
const art = Nunito({ subsets: ['latin'], variable: '--font-art', weight: ['500', '600', '700', '800', '900'] });
const body = Figtree({ subsets: ['latin'], variable: '--font-body', weight: ['400', '500', '600'] });

export const metadata: Metadata = {
  title: 'Yini',
  description: 'A private journal for two people, and one thing a day worth doing.',
};
export const viewport: Viewport = {
  width: 'device-width', initialScale: 1, maximumScale: 1, themeColor: '#FFFCEC',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${art.variable}`}>
      <body>
        {children}
        <DayWatcher />
      </body>
    </html>
  );
}
