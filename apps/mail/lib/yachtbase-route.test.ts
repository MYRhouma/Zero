import { describe, expect, it } from 'vitest';
import {
  LEGACY_EMAIL_BASE_PATH,
  EMAIL_BASE_PATH,
  toCanonicalEmailPath,
} from './yachtbase-route';

describe('toCanonicalEmailPath', () => {
  it('maps the legacy root', () => {
    expect(toCanonicalEmailPath(LEGACY_EMAIL_BASE_PATH, '')).toBe(EMAIL_BASE_PATH);
  });

  it('preserves folder suffixes and query state', () => {
    expect(toCanonicalEmailPath(`${LEGACY_EMAIL_BASE_PATH}/mail/sent`, '?threadId=t1'))
      .toBe(`${EMAIL_BASE_PATH}/mail/sent?threadId=t1`);
  });

  it('does not rewrite unrelated paths or partial prefixes', () => {
    expect(toCanonicalEmailPath('/dashboard/inbox', '')).toBe('/dashboard/inbox');
    expect(toCanonicalEmailPath(`${LEGACY_EMAIL_BASE_PATH}er`, '')).toBe(`${LEGACY_EMAIL_BASE_PATH}er`);
  });
});
