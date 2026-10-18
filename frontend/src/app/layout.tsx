import type { Metadata, Viewport } from 'next';
import { Nunito } from 'next/font/google';
import './globals.css';
import './app.css';
import { DayWatcher } from '@/components/DayWatcher';

// Nunito is the one typeface of the app and the art boards.
const art = Nunito({ subsets: ['latin'], variable: '--font-art', weight: ['500', '600', '700', '800', '900'] });

export const metadata: Metadata = {
  title: 'Yini',
  description: 'A private journal for two people, and one thing a day worth doing.',
};
export const viewport: Viewport = {
  width: 'device-width', initialScale: 1, maximumScale: 1, themeColor: '#FDF6EE',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={art.variable}>
      <body>
        {children}
        <DayWatcher />
      </body>
    </html>
  );
}
