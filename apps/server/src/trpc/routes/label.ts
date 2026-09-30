import { isYachtbaseImap, yachtbaseMail } from '../../lib/yachtbase-imap';
import { createFolder, deleteFolder, renameFolder } from '../../lib/yachtbase-imap-extras';
import { activeDriverProcedure, createRateLimiterMiddleware, router } from '../trpc';
import { getZeroAgent } from '../../lib/server-utils';
import { Ratelimit } from '@upstash/ratelimit';
import { z } from 'zod';

export const labelsRouter = router({
  list: activeDriverProcedure
    .use(
      createRateLimiterMiddleware({
        generatePrefix: ({ sessionUser }) => `ratelimit:get-labels-${sessionUser?.id}`,
        limiter: Ratelimit.slidingWindow(120, '1m'),
      }),
    )
    .output(
      z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          color: z
            .object({
              backgroundColor: z.string(),
              textColor: z.string(),
            })
            .optional(),
          type: z.string(),
        }),
      ),
    )
    .query(async ({ ctx }) => {
      const { activeConnection } = ctx;
      if (isYachtbaseImap(activeConnection)) {
        // Custom IMAP folders appear as labels; standard folders have their own nav.
        const { folders } = await yachtbaseMail(activeConnection, ctx.c.req.header('Authorization')).folders();
        return folders
          .filter((folder) => folder.role === 'custom')
          .map((folder) => ({ id: folder.name, name: folder.label || folder.name, type: 'user', labels: [], count: 0 }));
      }
      const { stub: agent } = await getZeroAgent(activeConnection.id);
      return await agent.getUserLabels();
    }),
  create: activeDriverProcedure
    .use(
      createRateLimiterMiddleware({
        generatePrefix: ({ sessionUser }) => `ratelimit:labels-post-${sessionUser?.id}`,
        limiter: Ratelimit.slidingWindow(60, '1m'),
      }),
    )
    .input(
      z.object({
        name: z.string(),
        color: z
          .object({
            backgroundColor: z.string(),
            textColor: z.string(),
          })
          .default({
            backgroundColor: '',
            textColor: '',
          }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { activeConnection } = ctx;
      if (isYachtbaseImap(activeConnection)) {
        // IMAP folders stand in for labels; colours are not an IMAP concept and are ignored.
        const folder = await createFolder(activeConnection, ctx.c.req.header('Authorization'), input.name);
        return { id: folder.name, name: folder.label, type: 'user' };
      }
      const { stub: agent } = await getZeroAgent(activeConnection.id);
      const label = {
        ...input,
        type: 'user',
      };
      return await agent.createLabel(label);
    }),
  update: activeDriverProcedure
    .use(
      createRateLimiterMiddleware({
        generatePrefix: ({ sessionUser }) => `ratelimit:labels-patch-${sessionUser?.id}`,
        limiter: Ratelimit.slidingWindow(60, '1m'),
      }),
    )
    .input(
      z.object({
        id: z.string(),
        name: z.string(),
        type: z.string().optional(),
        color: z
          .object({
            backgroundColor: z.string(),
            textColor: z.string(),
          })
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { activeConnection } = ctx;
      if (isYachtbaseImap(activeConnection)) {
        const folder = await renameFolder(activeConnection, ctx.c.req.header('Authorization'), input.id, input.name);
        return { id: folder.name, name: folder.label, type: 'user' };
      }
      const { stub: agent } = await getZeroAgent(activeConnection.id);
      const { id, ...label } = input;
      return await agent.updateLabel(id, label);
    }),
  delete: activeDriverProcedure
    .use(
      createRateLimiterMiddleware({
        generatePrefix: ({ sessionUser }) => `ratelimit:labels-delete-${sessionUser?.id}`,
        limiter: Ratelimit.slidingWindow(60, '1m'),
      }),
    )
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { activeConnection } = ctx;
      if (isYachtbaseImap(activeConnection)) {
        await deleteFolder(activeConnection, ctx.c.req.header('Authorization'), input.id);
        return;
      }
      const { stub: agent } = await getZeroAgent(activeConnection.id);
      return await agent.deleteLabel(input.id);
    }),
});
