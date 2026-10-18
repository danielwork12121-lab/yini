import type { Metadata } from 'next';
import { requirePairedUser } from '@/lib/page-user';
import { SubPage } from '@/components/app/SubPage';
import { EntriesPicker } from '@/components/app/settings/EntriesPicker';

export const metadata: Metadata = { title: 'Delete Entries · Yini' };
export const dynamic = 'force-dynamic';

export default async function DeleteEntriesPage() {
  await requirePairedUser();
  return (
    <SubPage title="Delete Entries" sub="Select the entries you’d like to remove. Only you can see these.">
      <EntriesPicker />
    </SubPage>
  );
}
