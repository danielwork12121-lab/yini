/**
 * New accounts are created with a name, an email and a password, and sign in with the email.
 *
 * Older accounts were made with a username only. Supabase Auth keys accounts on an email, so those
 * map to a private, never-mailed address; sign-in still understands them so nobody gets locked out.
 */
export const USERNAME_RE = /^[a-z0-9][a-z0-9_.-]{2,23}$/;
export const MIN_PASSWORD = 8;

/** Lowercase and trim, so "Sam " and "sam" are the same person. */
export const normalizeUsername = (raw: string) => raw.trim().toLowerCase();

/** `.invalid` is reserved (RFC 2606): it can never be a real, deliverable mailbox. */
export const usernameToEmail = (username: string) => `${normalizeUsername(username)}@yini-users.invalid`;

/** A message for the first thing wrong, or null when both are fine. */
export function checkCredentials(username: string, password: string): string | null {
  const u = normalizeUsername(username);
  if (!USERNAME_RE.test(u)) return 'Usernames are 3 to 24 letters, numbers, dots, dashes or underscores.';
  if (password.length < MIN_PASSWORD) return `Passwords need at least ${MIN_PASSWORD} characters.`;
  return null;
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const NAME_MAX = 40;

/** Lowercase and trim, so "Sam@Mail.com " and "sam@mail.com" are the same account. */
export const normalizeEmail = (raw: string) => raw.trim().toLowerCase();

/** A message for the first thing wrong with a new account, or null when all three are fine. */
export function checkSignup(name: string, email: string, password: string): string | null {
  const n = name.trim();
  if (!n) return 'Tell us the name your partner calls you.';
  if (n.length > NAME_MAX) return `Names can be up to ${NAME_MAX} characters.`;
  if (!EMAIL_RE.test(normalizeEmail(email))) return 'Enter a valid email address.';
  if (password.length < MIN_PASSWORD) return `Passwords need at least ${MIN_PASSWORD} characters.`;
  return null;
}
