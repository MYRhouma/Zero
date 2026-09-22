import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetSession = vi.hoisted(() => vi.fn());

vi.mock('./auth-proxy', () => ({
  authProxy: { api: { getSession: mockGetSession } },
}));

import { getYachtbaseSession, redirectToYachtbaseLogin } from './yachtbase-session';

describe('getYachtbaseSession', () => {
  beforeEach(() => {
    mockGetSession.mockReset();
  });

  it('returns the tenant-bound session', async () => {
    const headers = new Headers({ cookie: 'session=test' });
    mockGetSession.mockResolvedValue({
      user: { id: 'u1', email: 'captain@yachtbase.test' },
      tenant: { id: 't1' },
    });

    await expect(getYachtbaseSession(headers)).resolves.toEqual({
      user: { id: 'u1', email: 'captain@yachtbase.test' },
      tenant: { id: 't1' },
    });
    expect(mockGetSession).toHaveBeenCalledWith({ headers });
  });

  it('returns null for an expired session', async () => {
    mockGetSession.mockResolvedValue(null);

    await expect(getYachtbaseSession(new Headers())).resolves.toBeNull();
  });

  it('redirects mounted users to the compatibility login with a safe next path', () => {
    const response = redirectToYachtbaseLogin(
      new Request('https://app.yachtbase.co/dashboard/email/mail/inbox'),
    );

    expect(response.headers.get('location')).toBe(
      'https://app.yachtbase.co/dashboard/email/login?next=%2Fdashboard%2Femail%2Fmail%2Finbox',
    );
  });
});
