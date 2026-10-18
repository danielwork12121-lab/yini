import type { Metadata } from 'next';
import { requirePairedUser } from '@/lib/page-user';
import { SubPage } from '@/components/app/SubPage';
import { ProfileForm } from '@/components/app/settings/ProfileForm';

export const metadata: Metadata = { title: 'My Profile · Yini' };
export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const { user, status } = await requirePairedUser();
  const email = user.email?.endsWith('@yini-users.invalid') ? user.email.split('@')[0] : (user.email ?? '');
  return (
    <SubPage title="My Profile">
      <ProfileForm name={status.display_name && status.display_name !== 'You' ? status.display_name : ''} email={email} usernameLogin={Boolean(user.email?.endsWith('@yini-users.invalid'))} />
    </SubPage>
  );
}
