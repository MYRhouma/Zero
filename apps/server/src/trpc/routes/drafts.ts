import type { MailManager } from '../../lib/driver/types';
import { activeDriverProcedure, router } from '../trpc';
import { getZeroAgent } from '../../lib/server-utils';
import { createDraftData } from '../../lib/schemas';
import { isYachtbaseImap } from '../../lib/yachtbase-imap';
import { deleteDraft, getDraft, listDrafts, saveDraft } from '../../lib/yachtbase-imap-extras';
import { z } from 'zod';

export const draftsRouter = router({
  create: activeDriverProcedure.input(createDraftData).mutation(async ({ input, ctx }) => {
    const { activeConnection } = ctx;
    // Yachtbase IMAP mailboxes keep drafts in the server's Drafts folder.
    if (isYachtbaseImap(activeConnection)) {
      return saveDraft(activeConnection, ctx.c.req.header('Authorization'), {
        id: input.id, threadId: input.threadId, to: input.to, cc: input.cc, bcc: input.bcc,
        subject: input.subject, message: input.message,
      });
    }
    const { stub: agent } = await getZeroAgent(activeConnection.id);
    return agent.createDraft(input);
  }),
  get: activeDriverProcedure.input(z.object({ id: z.string() })).query(async ({ input, ctx }) => {
    const { activeConnection } = ctx;
    if (isYachtbaseImap(activeConnection)) return getDraft(activeConnection, ctx.c.req.header('Authorization'), input.id);
    const { stub: agent } = await getZeroAgent(activeConnection.id);
    const { id } = input;
    return agent.getDraft(id) as ReturnType<MailManager['getDraft']>;
  }),
  list: activeDriverProcedure
    .input(
      z.object({
        q: z.string().optional(),
        maxResults: z.number().optional(),
        pageToken: z.string().optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const { activeConnection } = ctx;
      if (isYachtbaseImap(activeConnection)) return listDrafts(activeConnection, ctx.c.req.header('Authorization'), input.q);
      const { stub: agent } = await getZeroAgent(activeConnection.id);
      const { q, maxResults, pageToken } = input;
      return agent.listDrafts({ q, maxResults, pageToken }) as Awaited<
        ReturnType<MailManager['listDrafts']>
      >;
    }),
  delete: activeDriverProcedure
    .input(
      z.object({
        id: z.string().min(1, 'id is required'),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { activeConnection } = ctx;
      if (isYachtbaseImap(activeConnection)) {
        await deleteDraft(activeConnection, ctx.c.req.header('Authorization'), input.id);
        return true;
      }
      const { stub: agent } = await getZeroAgent(activeConnection.id);
      await agent.deleteDraft(input.id);
      return true;
    }),
});
