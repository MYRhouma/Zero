import type { ParsedDraft } from './driver/types';
import { yachtbaseBridge } from './yachtbase-imap';
import { TRPCError } from '@trpc/server';

/**
 * IMAP folder management, original messages and server-side drafts for
 * Yachtbase-managed mailboxes. Django performs the IMAP work; these helpers
 * only forward the signed-in member's session to its owner-scoped bridge.
 */

type Connection = { accessToken: string | null };
type Authorization = string | undefined;

export type YachtbaseFolder = { name: string; label: string; role: string };

export type YachtbaseDraftInput = {
  id?: string | null;
  threadId?: string | null;
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  message: string;
};

const uuidPattern = /^[0-9a-f-]{36}$/i;

const mailboxCall = (connection: Connection, authorization: Authorization) => {
  const mailboxId = connection.accessToken || '';
  if (!uuidPattern.test(mailboxId)) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Your email session has expired. Reload the page.' });
  }
  const bridge = yachtbaseBridge(authorization);
  return <T>(path: string, init: RequestInit = {}) => bridge<T>(`/mailboxes/${mailboxId}${path}`, init);
};

const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) });

/** Create a custom folder on the mail server; its raw name is the label id. */
export function createFolder(connection: Connection, authorization: Authorization, label: string) {
  return mailboxCall(connection, authorization)<YachtbaseFolder>('/folders/manage/', json('POST', { label }));
}

/** Rename a custom folder (addressed by its raw server name). */
export function renameFolder(connection: Connection, authorization: Authorization, name: string, label: string) {
  return mailboxCall(connection, authorization)<YachtbaseFolder>('/folders/item/', json('PATCH', { name, label }));
}

/** Delete a custom folder; its messages are moved back to the inbox first. */
export function deleteFolder(connection: Connection, authorization: Authorization, name: string) {
  return mailboxCall(connection, authorization)<{ success: boolean; movedToInbox: number }>(
    `/folders/item/?name=${encodeURIComponent(name)}`,
    { method: 'DELETE' },
  );
}

/** Move whole conversations into a folder on the server (raw folder name, e.g. a label id). */
export function moveThreadsToFolder(connection: Connection, authorization: Authorization, ids: string[], folder: string) {
  return mailboxCall(connection, authorization)<{ success: boolean; moved: number }>('/threads/move/', json('POST', { ids, folder }));
}

/** The original RFC 822 source of one message, fetched from the mail server. */
export async function getRawEmail(connection: Connection, authorization: Authorization, messageId: string): Promise<string> {
  const { raw } = await mailboxCall(connection, authorization)<{ raw: string }>(`/messages/${encodeURIComponent(messageId)}/raw/`);
  return raw;
}

/** Save (create or replace) a draft in the server's Drafts folder; returns its id. */
export function saveDraft(connection: Connection, authorization: Authorization, draft: YachtbaseDraftInput) {
  return mailboxCall(connection, authorization)<{ id: string; success: boolean }>('/drafts/', json('POST', draft));
}

export function getDraft(connection: Connection, authorization: Authorization, draftId: string) {
  return mailboxCall(connection, authorization)<ParsedDraft>(`/drafts/${encodeURIComponent(draftId)}/`);
}

export function listDrafts(connection: Connection, authorization: Authorization, q?: string) {
  const query = q ? `?q=${encodeURIComponent(q)}` : '';
  return mailboxCall(connection, authorization)<{ threads: { id: string; historyId: string | null }[]; nextPageToken: string | null }>(
    `/drafts/${query}`,
  );
}

/** Delete a draft from the server and from Yachtbase (e.g. after it was sent). */
export async function deleteDraft(connection: Connection, authorization: Authorization, draftId: string): Promise<void> {
  await mailboxCall(connection, authorization)(`/drafts/${encodeURIComponent(draftId)}/`, { method: 'DELETE' });
}
