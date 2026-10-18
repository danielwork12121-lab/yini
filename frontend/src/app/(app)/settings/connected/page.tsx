import type { Metadata } from 'next';
import { requirePairedUser } from '@/lib/page-user';
import { SubPage } from '@/components/app/SubPage';
import { PersonIcon } from '@/components/app/icons';

export const metadata: Metadata = { title: 'Connected Person · Yini' };
export const dynamic = 'force-dynamic';

export default async function ConnectedPage() {
  const { status } = await requirePairedUser();
  const partner = status.partner_display_name ?? 'Your person';
  return (
    <SubPage title="Connected Person">
      <div className="card-plain card-center">
        <div className="avatar"><PersonIcon stroke="#D9A89B" /></div>
        <h2>{partner}</h2>
        <span className="tag-partner">♥ Partner</span>
      </div>
      <div className="lockbox">
        <svg viewBox="0 0 38 46" fill="none" stroke="#7D6D63" strokeWidth="4" strokeLinecap="round" aria-hidden="true"><rect x="3" y="19" width="32" height="24" rx="5" /><path d="M10 19 V12 a9 9 0 0 1 18 0 V19" /></svg>
        <span>Your connection type was chosen when you linked up, and it stays the same for this connection. Neither of you can see the other’s journal.</span>
      </div>
    </SubPage>
  );
}
