import { getGeminiComposeModelName, getGeminiGenerationSettings } from '../trpc/routes/ai/compose-model';
import { senderForConnection } from '../lib/yachtbase-sender-identity';
import { isYachtbaseImap, yachtbaseMail } from '../lib/yachtbase-imap';
import { senderIdentityPrompt } from '../lib/sender-identity';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { getActiveConnection } from '../lib/server-utils';
import { convertToCoreMessages, createDataStreamResponse, formatDataStreamPart, tool, type Message } from 'ai';
import { generateWithTools } from '../lib/ai-tool-loop';
import type { HonoContext } from '../ctx';
import { stripHtml } from 'string-strip-html';
import { env } from '../env';
import { Hono } from 'hono';
import { z } from 'zod';

/**
 * AI assistant for mailboxes served through Yachtbase (IMAP/SMTP). Mail is read
 * and organised through the owner-scoped Yachtbase bridge; the assistant never
 * sends email itself, it drafts text for the member to review and send.
 */

const MAX_THREADS = 15;
const MAX_BODY = 4_000;

const bodyText = (html?: string, text?: string) =>
  (text?.trim() ? text : stripHtml(html || '').result).replace(/\s+\n/g, '\n').slice(0, MAX_BODY);

const requestSchema = z.object({
  messages: z.array(z.any()).min(1).max(100),
  threadId: z.string().optional().nullable(),
  currentFolder: z.string().optional().nullable(),
});

export const mailboxAssistant = new Hono<HonoContext>().post('/chat', async (c) => {
  if (!c.var.sessionUser) return c.json({ error: 'Unauthorized' }, 401);
  const parsed = requestSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'Invalid request' }, 400);

  const connection = await getActiveConnection();
  if (!isYachtbaseImap(connection)) return c.json({ error: 'Unsupported mailbox' }, 400);

  const apiKey = env.GEMINI_API_KEY || env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) return c.json({ error: 'AI is not configured' }, 503);

  const authorization = c.req.header('Authorization');
  const mail = yachtbaseMail(connection, authorization);
  const sender = await senderForConnection(connection, c.var.sessionUser.name, authorization);
  const { threadId, currentFolder } = parsed.data;

  const summarize = async (id: string) => {
    const thread = await mail.get(id);
    const latest = thread.latest;
    return {
      threadId: id,
      subject: latest?.subject || '(No subject)',
      from: latest?.sender ? `${latest.sender.name || ''} <${latest.sender.email}>`.trim() : '',
      receivedOn: latest?.receivedOn,
      unread: thread.hasUnread,
      messages: thread.messages.length,
      preview: bodyText(latest?.decodedBody, latest?.body).slice(0, 300),
    };
  };

  const tools = {
    listThreads: tool({
      description: 'List or search email threads in a folder. Returns subject, sender, date, unread state and a short preview.',
      parameters: z.object({
        folder: z.enum(['inbox', 'sent', 'archive', 'bin']).default('inbox'),
        query: z.string().optional().describe('Words to search for in sender, subject or body'),
        limit: z.number().int().min(1).max(MAX_THREADS).default(10),
      }),
      execute: async ({ folder, query, limit }) => {
        const page = await mail.list({ folder, q: query, limit });
        return { threads: await Promise.all(page.threads.map((item) => summarize(item.id))) };
      },
    }),
    getThread: tool({
      description: 'Read every message of one email thread.',
      parameters: z.object({ threadId: z.string() }),
      execute: async ({ threadId }) => {
        const thread = await mail.get(threadId);
        return {
          threadId,
          messages: thread.messages.map((message) => ({
            from: `${message.sender?.name || ''} <${message.sender?.email || ''}>`.trim(),
            to: (message.to || []).map((item) => item.email),
            subject: message.subject,
            receivedOn: message.receivedOn,
            body: bodyText(message.decodedBody, message.body),
          })),
        };
      },
    }),
    organizeThreads: tool({
      description: 'Mark threads read or unread, archive them, move them to the bin, or restore them to the inbox.',
      parameters: z.object({
        threadIds: z.array(z.string()).min(1).max(50),
        action: z.enum(['read', 'unread', 'archive', 'trash', 'restore']),
      }),
      execute: async ({ threadIds, action }) => {
        await mail.apply(action, threadIds);
        return { success: true, action, threadIds };
      },
    }),
  };

  const model = createGoogleGenerativeAI({ apiKey })(
    getGeminiComposeModelName(env.GEMINI_MODEL, env.GEMINI_CONTACT_IMPORT_MODEL),
  );

  const system = [
    'You are an email assistant working inside the member\'s own mailbox.',
    senderIdentityPrompt(sender),
    `Today is ${new Date().toISOString().slice(0, 10)}.`,
    currentFolder ? `The member is looking at the "${currentFolder}" folder.` : '',
    threadId ? `The member has thread ${threadId} open; "this email" refers to it.` : '',
    'Use the tools to look at real mail before answering questions about it; never invent emails.',
    'When asked to write or reply to an email, write the full text in your answer so the member can copy it; you cannot send email.',
    'Only change mail (read state, archive, bin) when the member asks. Be concise and use the language the member writes in.',
  ].filter(Boolean).join('\n\n');

  const messages = convertToCoreMessages(parsed.data.messages as Message[]);
  return createDataStreamResponse({
    execute: async (stream) => {
      const text = await generateWithTools({
        model, system, messages, tools, maxTokens: 2_000, ...getGeminiGenerationSettings(0.4),
      });
      stream.write(formatDataStreamPart('text', text || 'I could not find an answer to that. Please try rephrasing.'));
    },
    onError: (error) => {
      console.error('[mailbox-assistant]', error);
      return 'The assistant could not complete this request. Please try again.';
    },
  });
});
