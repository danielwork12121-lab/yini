import Link from 'next/link';
import { BackArrow } from './icons';

/** The frame of a settings page: back arrow, centred title, optional line under it. */
export function SubPage({ title, sub, back = '/settings', children }: {
  title: string; sub?: string; back?: string; children: React.ReactNode;
}) {
  return (
    <main className="sub sub-wrap">
      <Link className="sub-back" href={back} aria-label="Back"><BackArrow /></Link>
      <header className="sub-head">
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </header>
      <div className="sub-body">{children}</div>
    </main>
  );
}
