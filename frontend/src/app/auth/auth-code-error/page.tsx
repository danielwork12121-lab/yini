import Link from 'next/link';

export default function AuthCodeError() {
  return (
    <main className="phone" style={{ paddingTop: 80 }}>
      <p className="display h1">That sign-in didn&apos;t finish</p>
      <p className="body" style={{ color: 'var(--ink-muted)' }}>
        The link expired or was already used. Nothing is wrong with your account — try again.
      </p>
      <Link href="/" className="btn" style={{ display: 'block', textAlign: 'center', lineHeight: '52px', textDecoration: 'none', marginTop: 20 }}>
        Back to sign in
      </Link>
    </main>
  );
}
