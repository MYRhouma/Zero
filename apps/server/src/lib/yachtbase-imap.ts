import type { IGetThreadResponse, IGetThreadsResponse } from './driver/types';
import type { ParsedMessage } from '../types';
import { TRPCError } from '@trpc/server';
import { env } from '../env';

/**
 * Mail for Yachtbase-managed IMAP mailboxes lives in Django, which holds the
 * IMAP/SMTP credentials. Zero talks to it with the signed-in member's
 * short-lived Yachtbase session token, so every call is owner-scoped there.
 */

type BridgeThread = {
  id: string;
  messages: ParsedMessage[];
  hasUnread: boolean;
  labels: { id: string; name: string }[];
  totalReplies: number;
};

type ThreadPage = { threads: BridgeThread[]; nextPageToken: string | null };

export type YachtbaseMailAction =
  | 'read' | 'unread' | 'archive' | 'trash' | 'restore'
  | 'star' | 'unstar' | 'important' | 'unimportant' | 'toggle_star' | 'toggle_important'
  | 'snooze' | 'unsnooze';

export type YachtbaseOutgoingMail = {
  to: { email: string; name?: string }[];
  cc?: { email: string; name?: string }[];
  bcc?: { email: string; name?: string }[];
  subject: string;
  html: string;
  threadId?: string;
  templateId?: string;
  attachments?: { filename: string; mimeType: string; data: string }[];
  /** ISO time to send at; omitted sends immediately. */
  sendAt?: string;
};

export type YachtbaseAttachment = {
  attachmentId: string;
  filename: string;
  mimeType: string;
  size: number;
  body: string;
  headers: { name: string; value: string }[];
};

const uuidPattern = /^[0-9a-f-]{36}$/i;

export const isYachtbaseImap = (connection: { providerId: string }) => connection.providerId === 'imap';

const bridgeError = (status: number) =>
  status === 401 ? 'UNAUTHORIZED' : status === 403 ? 'FORBIDDEN' : status === 404 ? 'NOT_FOUND' : status === 400 ? 'BAD_REQUEST' : 'INTERNAL_SERVER_ERROR';

/** Authenticated caller for the Yachtbase email bridge, rooted at `/bridge`. */
export function yachtbaseBridge(authorization: string | undefined) {
  const base = env.VITE_PUBLIC_YACHTBASE_API_URL?.replace(/\/$/, '');
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!base || !token) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Your email session has expired. Reload the page.' });
  }
  const root = `${base}/integrations/email-workspace/bridge`;
  return async <T>(path: string, init: RequestInit = {}): Promise<T> => {
    const response = await fetch(`${root}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...init.headers },
      cache: 'no-store',
    });
    if (!response.ok) {
      const detail = await response.json().then((body: any) => body?.detail || Object.values(body || {})[0]).catch(() => '');
      throw new TRPCError({ code: bridgeError(response.status), message: String(detail || 'Your mailbox could not complete this request.') });
    }
    return (response.status === 204 ? undefined : await response.json()) as T;
  };
}

export function yachtbaseMail(connection: { accessToken: string | null }, authorization: string | undefined) {
  const mailboxId = connection.accessToken || '';
  if (!uuidPattern.test(mailboxId)) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Your email session has expired. Reload the page.' });
  }
  const bridge = yachtbaseBridge(authorization);
  const call = <T>(path: string, init: RequestInit = {}) => bridge<T>(`/mailboxes/${mailboxId}${path}`, init);

  const threads = (params: Record<string, string | number | undefined>) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== '') query.set(key, String(value));
    return call<ThreadPage>(`/threads/?${query}`);
  };

  return {
    async list(input: { folder?: string; q?: string; cursor?: string; limit?: number; label?: string }): Promise<IGetThreadsResponse> {
      const page = await threads({ folder: input.folder, q: input.q, cursor: input.cursor, limit: input.limit, label: input.label });
      return { threads: page.threads.map((thread) => ({ id: thread.id, historyId: null })), nextPageToken: page.nextPageToken };
    },
    async get(threadId: string): Promise<IGetThreadResponse> {
      const [thread] = (await threads({ thread: threadId })).threads;
      if (!thread) throw new TRPCError({ code: 'NOT_FOUND', message: 'Message unavailable.' });
      return {
        messages: thread.messages,
        latest: thread.messages.findLast((message) => !message.isDraft) ?? thread.messages.at(-1),
        hasUnread: thread.hasUnread,
        labels: thread.labels,
        totalReplies: thread.totalReplies,
      };
    },
    async apply(action: YachtbaseMailAction, ids: string[], extra: { until?: string } = {}) {
      const threadIds = ids.filter((id) => uuidPattern.test(id));
      if (!threadIds.length) return { success: true };
      return call<{ success: boolean }>('/threads/actions/', { method: 'POST', body: JSON.stringify({ action, ids: threadIds, ...extra }) });
    },
    folders() {
      return call<{ folders: { name: string; label: string; role: string }[] }>('/folders/');
    },
    send(mail: YachtbaseOutgoingMail) {
      return call<{ success: boolean; threadId: string; messageId: string }>('/send/', { method: 'POST', body: JSON.stringify(mail) });
    },
    cancel(messageId: string) {
      return call<{ success: boolean }>(`/messages/${encodeURIComponent(messageId)}/cancel/`, { method: 'POST' });
    },
    async attachments(messageId: string) {
      if (!uuidPattern.test(messageId)) return [];
      return (await call<{ attachments: YachtbaseAttachment[] }>(`/messages/${messageId}/attachments/`)).attachments;
    },
    sync() {
      return call<{ success: boolean }>('/sync/', { method: 'POST' });
    },
  };
}

/** Zero label changes expressed as Yachtbase folder actions. */
export function actionForLabels(add: string[], remove: string[]): YachtbaseMailAction | null {
  const has = (list: string[], label: string) => list.some((item) => item.toUpperCase() === label);
  if (has(add, 'TRASH')) return 'trash';
  if (has(add, 'INBOX') || has(remove, 'TRASH')) return 'restore';
  if (has(remove, 'INBOX')) return 'archive';
  if (has(remove, 'UNREAD')) return 'read';
  if (has(add, 'UNREAD')) return 'unread';
  if (has(add, 'STARRED')) return 'star';
  if (has(remove, 'STARRED')) return 'unstar';
  if (has(add, 'IMPORTANT')) return 'important';
  if (has(remove, 'IMPORTANT')) return 'unimportant';
  return null;
}
