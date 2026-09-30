import { yachtbaseBridge } from '../../lib/yachtbase-imap';
import { privateProcedure, router } from '../trpc';
import { z } from 'zod';

/**
 * Designed email templates shared by the member's Yachtbase workspace. Django
 * stores and renders them; this router only forwards the member's session.
 */

const fieldSchema = z.object({
  key: z.string(),
  label: z.string().optional(),
  type: z.enum(['text', 'textarea', 'image', 'url', 'color']).optional(),
  value: z.string().optional(),
});

const templateInput = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(255).optional().default(''),
  subject: z.string().max(255).optional().default(''),
  businessId: z.string().uuid().nullable().optional(),
  html: z.string().min(1),
  fields: z.array(fieldSchema).optional().default([]),
});

export type WorkspaceTemplateField = z.infer<typeof fieldSchema> & {
  label: string;
  type: 'text' | 'textarea' | 'image' | 'url' | 'color';
  value: string;
};

export type WorkspaceTemplateSummary = {
  id: string;
  name: string;
  description: string;
  subject: string;
  businessId: string | null;
  businessName: string | null;
  updatedAt: string;
};

export type WorkspaceTemplate = WorkspaceTemplateSummary & { html: string; fields: WorkspaceTemplateField[] };

const bridge = (ctx: { c: { req: { header: (name: string) => string | undefined } } }) =>
  yachtbaseBridge(ctx.c.req.header('Authorization'));

const body = (input: unknown) => ({ body: JSON.stringify(input) });

export const workspaceTemplatesRouter = router({
  list: privateProcedure.query(({ ctx }) =>
    bridge(ctx)<{ templates: WorkspaceTemplateSummary[]; canEdit: boolean; businesses: { id: string; name: string }[] }>(
      '/templates/',
    ),
  ),
  get: privateProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(({ ctx, input }) => bridge(ctx)<WorkspaceTemplate>(`/templates/${input.id}/`)),
  create: privateProcedure
    .input(templateInput)
    .mutation(({ ctx, input }) => bridge(ctx)<WorkspaceTemplate>('/templates/', { method: 'POST', ...body(input) })),
  update: privateProcedure
    .input(templateInput.extend({ id: z.string().uuid() }))
    .mutation(({ ctx, input: { id, ...input } }) =>
      bridge(ctx)<WorkspaceTemplate>(`/templates/${id}/`, { method: 'PUT', ...body(input) }),
    ),
  delete: privateProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await bridge(ctx)(`/templates/${input.id}/`, { method: 'DELETE' });
      return { success: true };
    }),
  /** Save an edited email as a new template; its message area becomes the {{content}} slot. */
  saveFromEmail: privateProcedure
    .input(
      z.object({
        name: z.string().min(1).max(120),
        description: z.string().max(255).optional().default(''),
        subject: z.string().max(255).optional().default(''),
        businessId: z.string().uuid().nullable().optional(),
        html: z.string().min(1).max(200_000),
      }),
    )
    .mutation(({ ctx, input }) =>
      bridge(ctx)<WorkspaceTemplate>('/templates/from-email/', { method: 'POST', ...body(input) }),
    ),
  /** Upload a picture and get a permanent public address to use in emails. */
  uploadImage: privateProcedure
    .input(z.object({ filename: z.string().min(1).max(200), data: z.string().min(1).max(14_000_000) }))
    .mutation(({ ctx, input }) =>
      bridge(ctx)<{ url: string }>('/uploads/images/', { method: 'POST', ...body(input) }),
    ),
  preview: privateProcedure
    .input(
      z.object({
        templateId: z.string().uuid().optional(),
        html: z.string().optional(),
        fields: z.array(fieldSchema).optional(),
        content: z.string().optional(),
        subject: z.string().optional(),
      }),
    )
    .mutation(({ ctx, input }) =>
      bridge(ctx)<{ html: string; fields: WorkspaceTemplateField[] }>('/templates/preview/', { method: 'POST', ...body(input) }),
    ),
});
