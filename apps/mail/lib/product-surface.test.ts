import { readFile } from 'node:fs/promises';
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

  it('keeps retired standalone pages out of the mounted route table', async () => {
    const routeTable = await readFile(new URL('../app/routes.ts', import.meta.url), 'utf8');

    expect(routeTable).toContain("prefix('/mail'");
    expect(routeTable).not.toContain("layout('(full-width)/layout.tsx'");
    expect(routeTable).not.toContain("route('/developer'");
    expect(routeTable).toContain("index('page.tsx')");
  });

  it('uses a basename-relative inbox redirect from the mounted root', async () => {
    const homeRoute = await readFile(new URL('../app/page.tsx', import.meta.url), 'utf8');

    expect(homeRoute).toContain("redirect('/mail/inbox')");
    expect(homeRoute).not.toContain("redirect('/dashboard/email/mail/inbox')");
  });
});
