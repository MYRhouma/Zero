import { describe, expect, it } from 'vitest';
import { isStandaloneProductPath } from './product-surface';

describe('isStandaloneProductPath', () => {
  it('marks retired product surfaces as standalone', () => {
    for (const pathname of ['/about', '/pricing', '/privacy', '/terms', '/contributors', '/hr', '/developer', '/login']) {
      expect(isStandaloneProductPath(pathname)).toBe(true);
    }
  });

  it('keeps the mounted email workspace out of the retired surface set', () => {
    expect(isStandaloneProductPath('/dashboard/email/mail/inbox')).toBe(false);
    expect(isStandaloneProductPath('/mail/inbox')).toBe(false);
  });
});
