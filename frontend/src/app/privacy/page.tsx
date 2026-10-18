import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy · Yini',
  description: 'What Yini collects, why, and who can see it.',
};

const CONTACT = 'daniel.zilin.li@gmail.com';

export default function PrivacyPage() {
  return (
    <main className="legal">
      <Link href="/" className="small legal-back">← Back to Yini</Link>

      <h1 className="display legal-title">Privacy</h1>
      <p className="small">Last updated October 17, 2026</p>

      <p>
        Yini is a private journal for two people. This page says what we keep, why we keep
        it, and who can see it. Yini is an early project built for LA Hacks 2026, so we have
        kept the policy short and plain.
      </p>

      <h2 className="display">What we collect</h2>
      <ul>
        <li>
          <strong>Your Google account basics.</strong> When you choose Continue with Google
          we receive your name, email address and profile picture, and nothing else. We use
          them to sign you in and to show your name to the one person you pair with.
        </li>
        <li>
          <strong>What you write or say in Yini.</strong> Journal entries, voice-note
          transcripts, and the suggestions we generate from them.
        </li>
        <li>
          <strong>Your buddy.</strong> The companion you pick and how it is growing.
        </li>
      </ul>

      <h2 className="display">Who can see your entries</h2>
      <p>
        Only you. Your partner never sees what you write, and Yini never tells either of you
        whether the other has checked in. The only thing shared between you is the
        suggestions Yini writes for the two of you.
      </p>

      <h2 className="display">Who processes your data</h2>
      <ul>
        <li>
          <strong>Supabase</strong> stores accounts and entries in a hosted database.
        </li>
        <li>
          <strong>Vercel</strong> hosts the app.
        </li>
        <li>
          <strong>An AI model provider</strong> reads an entry in order to write the
          suggestion for it. Entries are sent for that purpose only. We do not sell your
          data or use it for advertising.
        </li>
      </ul>

      <h2 className="display">Google user data</h2>
      <p>
        Yini&apos;s use of information received from Google APIs is limited to signing you
        in. We ask for the basic profile and email scopes only. We do not read your email,
        contacts, calendar or files.
      </p>

      <h2 className="display">Deleting your data</h2>
      <p>
        Email <a href={`mailto:${CONTACT}`}>{CONTACT}</a> from the address you signed up
        with and we will delete your account and every entry linked to it.
      </p>

      <h2 className="display">Contact</h2>
      <p>
        Questions about any of this: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
      </p>
    </main>
  );
}
