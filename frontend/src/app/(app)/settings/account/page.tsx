import type { Metadata } from 'next';
import { requirePairedUser } from '@/lib/page-user';
import { SubPage } from '@/components/app/SubPage';
import { AccountView } from '@/components/app/settings/AccountView';

export const metadata: Metadata = { title: 'Account & Security · Yini' };
export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const { user } = await requirePairedUser();
  const synthetic = Boolean(user.email?.endsWith('@yini-users.invalid'));
  const providers = (user.app_metadata?.providers as string[] | undefined) ?? [user.app_metadata?.provider as string ?? 'email'];
  return (
    <SubPage title="Account & Security">
      <AccountView
        label={synthetic ? 'Username' : 'Email'}
        value={synthetic ? (user.email ?? '').split('@')[0] : (user.email ?? '')}
        password={providers.includes('email')}
        google={providers.includes('google')}
      />
    </SubPage>
  );
}
