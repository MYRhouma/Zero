import { describe, it, expect } from 'vitest';
import { requireGoogleMailboxConsent } from './mailbox-consent';

describe('Google mailbox consent', () => {
  it.each([undefined, '', 'openid email profile', 'https://www.googleapis.com/auth/gmail.readonly'])('rejects incomplete mail permissions: %s', scope => {
    expect(() => requireGoogleMailboxConsent(scope)).toThrow();
  });
  it.each(['https://mail.google.com/ openid email', 'https://www.googleapis.com/auth/gmail.modify openid'])('accepts granted read/write mail access: %s', scope => {
    expect(requireGoogleMailboxConsent(scope)).toBe(scope);
  });
});
