import type { Metadata } from 'next';
import { NotificationsView } from '@/components/app/NotificationsView';

export const metadata: Metadata = { title: 'Notifications · Yini' };

export default function NotificationsPage() {
  return <NotificationsView />;
}
