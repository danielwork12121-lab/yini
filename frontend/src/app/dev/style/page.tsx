import { notFound } from 'next/navigation';
import { AppChrome } from '@/components/app/AppChrome';
import { FeedDemo } from './FeedDemo';
import { HomeView } from '@/components/yini/HomeView';

/** The Home screen with made-up names and no sign-in, so a style change can be looked at on its own. Only in development and on preview deployments. */
export default function Page() {
  if (process.env.NODE_ENV !== 'development' && process.env.VERCEL_ENV !== 'preview') notFound();
  return <AppChrome><FeedDemo /><HomeView name="Daniel" partner="Mia" /></AppChrome>;
}
