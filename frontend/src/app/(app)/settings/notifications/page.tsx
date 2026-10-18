import type { Metadata } from 'next';
import { SubPage } from '@/components/app/SubPage';
import { NotificationPrefs } from '@/components/app/settings/NotificationPrefs';

export const metadata: Metadata = { title: 'Notification settings · Yini' };

export default function NotificationSettingsPage() {
  return (
    <SubPage title="Notification settings" sub="Gentle nudges, only the ones you want." back="/notifications">
      <NotificationPrefs />
    </SubPage>
  );
}
