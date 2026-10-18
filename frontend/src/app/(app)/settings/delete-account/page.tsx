import type { Metadata } from 'next';
import { requirePairedUser } from '@/lib/page-user';
import { SubPage } from '@/components/app/SubPage';
import { DeleteAccountView } from '@/components/app/settings/DeleteAccountView';

export const metadata: Metadata = { title: 'Delete Account · Yini' };
export const dynamic = 'force-dynamic';

export default async function DeleteAccountPage() {
  const { status } = await requirePairedUser();
  return (
    <SubPage title="Delete Account">
      <DeleteAccountView partner={status.partner_display_name ?? 'Your person'} />
    </SubPage>
  );
}
