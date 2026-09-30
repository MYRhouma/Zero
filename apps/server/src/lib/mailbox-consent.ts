export function requireGoogleMailboxConsent(scope: string | undefined | null): string {
  const granted = new Set((scope ?? '').split(/\s+/));
  if (!granted.has('https://mail.google.com/') && !granted.has('https://www.googleapis.com/auth/gmail.modify')) {
    throw new Error('Please grant email access to connect this mailbox.');
  }
  return scope!;
}
