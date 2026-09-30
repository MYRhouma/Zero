import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../env', () => ({ env: { VITE_PUBLIC_YACHTBASE_API_URL: 'https://api.example.test/api/v1' } }));

const extras = await import('./yachtbase-imap-extras');

const connection = { accessToken: '11111111-2222-4333-8444-555555555555' };
const auth = 'Bearer token';
const root = `https://api.example.test/api/v1/integrations/email-workspace/bridge/mailboxes/${connection.accessToken}`;

describe('Yachtbase IMAP extras', () => {
  afterEach(() => vi.unstubAllGlobals());

  const stub = (body: unknown, status = 200) => {
    const fetchMock = vi.fn(async (..._args: [string, RequestInit?]) => new Response(status === 204 ? null : JSON.stringify(body), { status }));
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
  };

  it('calls the owner-scoped bridge endpoints with the member session', async () => {
    const fetchMock = stub({ success: true, moved: 2 });
    await extras.moveThreadsToFolder(connection, auth, ['a'], 'INBOX.Clients');
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`${root}/threads/move/`);
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({ ids: ['a'], folder: 'INBOX.Clients' });
    expect((init.headers as Record<string, string>).Authorization).toBe(auth);
  });

  it('addresses folders by their encoded raw name and returns raw messages', async () => {
    const fetchMock = stub({ raw: 'Subject: Hi' });
    expect(await extras.getRawEmail(connection, auth, 'm-1')).toBe('Subject: Hi');
    await extras.deleteFolder(connection, auth, 'INBOX.Salon & co');
    expect(fetchMock.mock.calls[1][0]).toBe(`${root}/folders/item/?name=INBOX.Salon%20%26%20co`);
  });

  it('refuses to call without a mailbox id', () => {
    expect(() => extras.listDrafts({ accessToken: null }, auth)).toThrow();
  });
});
