import { and, eq } from 'drizzle-orm';
import { createDb } from '../db';
import { connection as connectionTable, user } from '../db/schema';
import { env } from '../env';
import { EProviders } from '../types';
import { getZeroDB } from './server-utils';
import type { YachtbaseMailIdentity } from './yachtbase-session';

type MailboxRef = { id: string; email: string; name: string | null };
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PROVISION_TTL_MS = 60_000;
const provisionedAt = new Map<string, number>();

export async function listOwnedYachtbaseImapMailboxes(token: string): Promise<MailboxRef[]> {
  const base = env.VITE_PUBLIC_YACHTBASE_API_URL?.replace(/\/$/, '');
  if (!base) throw new Error('Yachtbase API URL is missing');
  const response = await fetch(`${base}/integrations/email-workspace/bridge/mailboxes/`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`Yachtbase mailbox bridge rejected the request (${response.status})`);
  const payload = (await response.json()) as { mailboxes?: unknown };
  if (!Array.isArray(payload.mailboxes)) throw new Error('Invalid Yachtbase mailbox response');
  return payload.mailboxes.map((mailbox: unknown) => {
    if (!mailbox || typeof mailbox !== 'object') throw new Error('Invalid Yachtbase mailbox');
    const item = mailbox as Record<string, unknown>;
    if (typeof item.id !== 'string' || !uuidPattern.test(item.id) || typeof item.email !== 'string' || !item.email.includes('@')) {
      throw new Error('Invalid Yachtbase mailbox');
    }
    return { id: item.id, email: item.email, name: typeof item.name === 'string' ? item.name : null };
  });
}

/**
 * Mirror the member's Yachtbase IMAP mailboxes as Zero connections. Only
 * ownership metadata is stored; Django retains all IMAP and SMTP credentials.
 */
export async function provisionYachtbaseImapConnections(identity: YachtbaseMailIdentity, token: string) {
  const zeroDb = await getZeroDB(identity.zeroUserId);
  const fresh = Date.now() - (provisionedAt.get(identity.zeroUserId) ?? 0) < PROVISION_TTL_MS;
  if (fresh) {
    const cached = await zeroDb.findUser();
    if (cached) return cached;
  }

  const mailboxes = await listOwnedYachtbaseImapMailboxes(token);
  const { db, conn } = createDb(env.HYPERDRIVE.connectionString);
  try {
    await db.insert(user).values({
      id: identity.zeroUserId,
      name: identity.name,
      // Placeholder address keeps Zero's unique user email from clashing with
      // any standalone Zero account; the real address comes from the session.
      email: `${identity.userId}.${identity.tenantId}@identity.yachtbase.invalid`,
      emailVerified: true,
      createdAt: new Date(), updatedAt: new Date(),
    }).onConflictDoUpdate({ target: user.id, set: { name: identity.name, updatedAt: new Date() } });

    const existing = (await zeroDb.findManyConnections()).filter((item) => item.providerId === 'imap');
    for (const mailbox of mailboxes) {
      const current = existing.find((item) => item.email.toLowerCase() === mailbox.email.toLowerCase());
      const name = mailbox.name || mailbox.email;
      if (current && current.accessToken === mailbox.id && current.name === name) continue;
      const [connection] = current
        ? [current]
        : await zeroDb.createConnection(EProviders.imap, mailbox.email, {
            scope: 'yachtbase:imap', expiresAt: new Date('9999-12-31T00:00:00Z'),
          });
      await zeroDb.updateConnection(connection.id, {
        name,
        accessToken: mailbox.id,
        refreshToken: 'yachtbase-session-bridge',
      });
    }

    const liveIds = new Set(mailboxes.map((mailbox) => mailbox.id));
    for (const stale of existing.filter((item) => !liveIds.has(item.accessToken || ''))) {
      await db.delete(connectionTable).where(and(eq(connectionTable.id, stale.id), eq(connectionTable.userId, identity.zeroUserId)));
    }

    const remaining = (await zeroDb.findManyConnections()).map((item) => item.id);
    const current = await db.query.user.findFirst({ where: eq(user.id, identity.zeroUserId) });
    if (!current?.defaultConnectionId || !remaining.includes(current.defaultConnectionId)) {
      await db.update(user)
        .set({ defaultConnectionId: remaining[0] ?? null, updatedAt: new Date() })
        .where(eq(user.id, identity.zeroUserId));
    }
    provisionedAt.set(identity.zeroUserId, Date.now());
    return await zeroDb.findUser();
  } finally {
    await conn.end();
  }
}
