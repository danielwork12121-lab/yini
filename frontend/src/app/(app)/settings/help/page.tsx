import type { Metadata } from 'next';
import { requirePairedUser } from '@/lib/page-user';
import { SubPage } from '@/components/app/SubPage';
import { HelpForm } from '@/components/app/settings/HelpForm';

export const metadata: Metadata = { title: 'Help & Feedback · Yini' };
export const dynamic = 'force-dynamic';

export default async function HelpPage() {
  await requirePairedUser();
  return (
    <SubPage title="Help & Feedback" sub="Found a bug or have an idea? We’d love to hear it.">
      <HelpForm />
    </SubPage>
  );
}
