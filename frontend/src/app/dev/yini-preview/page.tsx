import { notFound } from 'next/navigation';
import localFont from 'next/font/local';
import { YiniPreview } from './YiniPreview';

const nunito = localFont({ src: './assets/nunito.woff2', weight: '200 1000', variable: '--font-yini-welcome' });

export default function Page() {
  if (process.env.NODE_ENV !== 'development' && process.env.VERCEL_ENV !== 'preview') notFound();
  return <div className={nunito.variable}><YiniPreview /></div>;
}
