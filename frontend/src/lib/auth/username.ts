/**
 * Yini sign-up is by username and password. Supabase Auth keys accounts on an
 * email, so a username maps to a private, never-mailed address. The mapping is
 * the same on the server (sign-up) and in the browser (sign-in).
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
