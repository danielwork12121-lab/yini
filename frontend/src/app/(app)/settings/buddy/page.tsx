import type { Metadata } from 'next';
import { requirePairedUser } from '@/lib/page-user';
import { SubPage } from '@/components/app/SubPage';
import { BuddyView } from '@/components/app/settings/BuddyView';

export const metadata: Metadata = { title: 'Our Little Buddy · Yini' };
export const dynamic = 'force-dynamic';

export default async function BuddyPage() {
  const { status } = await requirePairedUser();
  return (
    <SubPage title="Our Little Buddy">
      <BuddyView partner={status.partner_display_name ?? 'your person'} />
    </SubPage>
  );
}
