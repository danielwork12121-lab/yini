import { AppChrome } from '@/components/app/AppChrome';

/** Everything a signed-in person sees shares one frame: header, tabs, and room for the page between. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppChrome>{children}</AppChrome>;
}
