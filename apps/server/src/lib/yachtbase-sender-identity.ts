import type { SenderIdentity } from './sender-identity';
import { env } from '../env';

type Business = { name?: unknown; description?: unknown; website?: unknown };
type MailboxPayload = { id?: unknown; business?: Business | null };
type BridgePayload = { mailboxes?: MailboxPayload[]; workspace?: { name?: unknown } | null };

const TTL_MS = 5 * 60_000;
const cache = new Map<string, { at: number; value: Partial<SenderIdentity> }>();

const text = (value: unknown) => (typeof value === 'string' ? value : '');

/**
 * Business details for a Yachtbase mailbox (the business it writes for and the
 * workspace name), resolved by Django. Returns {} when unavailable so AI
 * features keep working from the mailbox's own name and address.
 */
export async function yachtbaseSenderContext(
  mailboxId: string | null | undefined,
  authorization: string | undefined,
): Promise<Partial<SenderIdentity>> {
  const base = env.VITE_PUBLIC_YACHTBASE_API_URL?.replace(/\/$/, '');
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!base || !mailboxId || !token) return {};

  const cached = cache.get(mailboxId);
  if (cached && Date.now() - cached.at < TTL_MS) return cached.value;

  try {
    const response = await fetch(`${base}/integrations/email-workspace/bridge/mailboxes/`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!response.ok) return cached?.value ?? {};
    const payload = (await response.json()) as BridgePayload;
    const workspaceName = text(payload.workspace?.name);
    for (const mailbox of payload.mailboxes ?? []) {
      const id = text(mailbox.id);
      if (!id) continue;
      const business = mailbox.business ?? null;
      cache.set(id, {
        at: Date.now(),
        value: {
          businessName: text(business?.name),
          businessDescription: text(business?.description),
          businessWebsite: text(business?.website),
          workspaceName,
        },
      });
    }
    return cache.get(mailboxId)?.value ?? {};
  } catch {
    return cached?.value ?? {};
  }
}

/** Full sender identity for the active connection and signed-in member. */
export async function senderForConnection(
  connection: { providerId: string; accessToken: string | null; name: string | null; email: string },
  personName: string | null | undefined,
  authorization: string | undefined,
): Promise<SenderIdentity> {
  const business = connection.providerId === 'imap'
    ? await yachtbaseSenderContext(connection.accessToken, authorization)
    : {};
  return { personName, mailboxName: connection.name, mailboxEmail: connection.email, ...business };
}
