import { getGeminiComposeModelName, getGeminiGenerationSettings } from './compose-model';
import { senderIdentityPrompt } from '../../../lib/sender-identity';
import { senderForConnection } from '../../../lib/yachtbase-sender-identity';
import { activeConnectionProcedure } from '../../trpc';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { TRPCError } from '@trpc/server';
import { env } from '../../../env';
import { generateText } from 'ai';
import { z } from 'zod';

/**
 * Edit a designed email (or a template layout) from a plain-language
 * instruction. The result is sanitized and must keep the message area.
 */

const MESSAGE_MARKER = 'data-yb-content=""';
const CONTENT_PLACEHOLDER = '{{content}}';

const fieldSchema = z.object({ key: z.string(), label: z.string().optional(), type: z.string().optional(), value: z.string() });

const inputSchema = z.object({
  mode: z.enum(['email', 'template', 'plain']),
  instruction: z.string().trim().min(2).max(2000),
  // A plain email may still be empty: the assistant then writes it.
  html: z.string().max(200_000),
  fields: z.array(fieldSchema).max(60).optional(),
  images: z.array(z.object({ url: z.string().url(), name: z.string().max(200).optional() })).max(10).optional(),
  /** Text of the conversation being replied to, so replies can be written in context. */
  context: z.string().max(20_000).optional(),
});

export type DesignEditMode = z.infer<typeof inputSchema>['mode'];

/** Remove anything that could run code in a mail client or in the editor. */
export function sanitizeEmailHtml(html: string): string {
  return html
    .replace(/<script\b[\s\S]*?<\/script\s*>/gi, '')
    .replace(/<(iframe|object|embed|form)\b[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<\/?(iframe|object|embed|form)\b[^>]*>/gi, '')
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|src)\s*=\s*(["'])\s*(javascript|vbscript|data:text\/html)[^"']*\2/gi, '$1=$2#$2');
}

/** Extract the JSON object a model returned, tolerating code fences and prose. */
export function parseModelJson(text: string): Record<string, unknown> {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1] ?? text;
  const start = fenced.indexOf('{');
  const end = fenced.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('No JSON object in model output');
  return JSON.parse(fenced.slice(start, end + 1)) as Record<string, unknown>;
}

const plainPrompt = (sender: string) => `You are an email writing assistant editing the body of an email the user is writing.
${sender}

Rules:
- Apply the change the user asks for. If the email is empty, write it from their request.
- Keep what the user did not ask to change, and keep the email's language unless asked otherwise.
- Write only the body (no subject line, no placeholders like [Name]); sign with the sender's name when a signature fits.
- Use simple HTML only: <p>, <br>, <strong>, <em>, <u>, <a href>, <ul>, <ol>, <li>, <blockquote>, <h2>, <h3>, and <img src alt> for pictures the user provides.
- Never mention the software used to send the email.

Reply with only a JSON object:
{"summary": "<one short sentence describing what you changed>", "html": "<the complete new body HTML>"}`;

const systemPrompt = (mode: DesignEditMode, sender: string) => `You are an expert email designer editing a production HTML email.
${sender}

Rules:
- Apply exactly the change the user asks for and keep everything else identical.
- Keep it valid, email-client-safe HTML: table layout, inline styles, no JavaScript, no external CSS, no forms.
- Keep all text in the same language as the email unless asked otherwise.
- Never mention the software used to send the email.
- Only use picture URLs that already appear in the email or that the user provides.
${mode === 'email'
    ? `- The element <div ${MESSAGE_MARKER}> holds the message body. Keep that element (you may edit the text inside it).`
    : `- The layout uses {{placeholder}} markers whose values are in "fields". Keep ${CONTENT_PLACEHOLDER} exactly once. To change a text, picture, link or colour that comes from a placeholder, change its field value instead of the HTML. You may add new placeholders and matching fields.`}

Reply with only a JSON object describing precise edits (do NOT return the whole document):
{"summary": "<one short sentence describing what you changed>",
 "edits": [{"find": "<an exact substring copied from the current ${mode === 'email' ? 'HTML' : 'layout HTML'}, long enough to be unique>", "replace": "<its replacement>"}]${mode === 'template' ? ',\n "fields": [{"key": "<placeholder name>", "value": "<new value>"}]' : ''}}
Copy "find" strings character for character. Use as few, small edits as possible.`;

/** Apply exact find/replace edits; returns the new HTML and how many were applied. */
export function applyEdits(html: string, edits: unknown): { html: string; applied: number; missed: number } {
  let applied = 0;
  let missed = 0;
  for (const edit of Array.isArray(edits) ? edits : []) {
    const find = typeof edit?.find === 'string' ? edit.find : '';
    const replace = typeof edit?.replace === 'string' ? edit.replace : '';
    if (find && html.includes(find)) {
      html = html.split(find).join(replace);
      applied += 1;
    } else {
      missed += 1;
    }
  }
  return { html, applied, missed };
}

const model = () => {
  const apiKey = env.GEMINI_API_KEY || env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'AI is not configured.' });
  return createGoogleGenerativeAI({ apiKey })(getGeminiComposeModelName(env.GEMINI_MODEL, env.GEMINI_CONTACT_IMPORT_MODEL));
};

export const editDesign = activeConnectionProcedure.input(inputSchema).mutation(async ({ ctx, input }) => {
  const { activeConnection } = ctx;
  const sender = await senderForConnection(activeConnection, ctx.sessionUser.name, ctx.c.req.header('Authorization'));
  const pictures = input.images?.length
    ? `\n\nPictures the user uploaded for this change:\n${input.images.map((image) => `- ${image.name || 'picture'}: ${image.url}`).join('\n')}`
    : '';
  const document = input.mode === 'template'
    ? JSON.stringify({ html: input.html, fields: input.fields ?? [] })
    : input.html;

  let parsed: Record<string, unknown>;
  try {
    const { text } = await generateText({
      model: model(),
      system: input.mode === 'plain' ? plainPrompt(senderIdentityPrompt(sender)) : systemPrompt(input.mode, senderIdentityPrompt(sender)),
      prompt: `Change requested: ${input.instruction}${pictures}${input.context ? `\n\nThe email being replied to (for context only):\n${input.context}` : ''}\n\nCurrent ${{ email: 'email HTML', template: 'template (JSON)', plain: 'email body HTML (may be empty)' }[input.mode]}:\n${document || '(empty)'}`,
      ...getGeminiGenerationSettings(0.2),
    });
    parsed = parseModelJson(text);
  } catch (error) {
    console.error('[editDesign] model failed', error);
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'The AI could not apply this change. Try rephrasing it.' });
  }

  if (input.mode === 'plain') {
    const html = typeof parsed.html === 'string' ? sanitizeEmailHtml(parsed.html).trim() : '';
    if (!html) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'The AI could not write this change. Try describing it differently.' });
    }
    return { html, fields: undefined, summary: typeof parsed.summary === 'string' ? parsed.summary.slice(0, 300) : 'Change applied.' };
  }
  const result = applyEdits(input.html, parsed.edits);
  const html = sanitizeEmailHtml(result.html);
  const suggested = Array.isArray(parsed.fields) ? parsed.fields : [];
  const fields = input.mode === 'template'
    ? suggested
        .filter((item): item is { key: string; value: unknown } => !!item && typeof (item as any).key === 'string')
        .map((item) => ({ key: item.key, value: String(item.value ?? '') }))
    : undefined;
  if (!result.applied && !fields?.length) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'The AI could not find what to change. Try naming the exact text or picture.' });
  }
  const keepsMessage = input.mode === 'email'
    ? html.includes(MESSAGE_MARKER)
    : html.split(CONTENT_PLACEHOLDER).length === 2;
  if (!keepsMessage) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'That change would remove the message area. Try a more specific instruction.' });
  }

  return {
    html,
    fields,
    summary: typeof parsed.summary === 'string' ? parsed.summary.slice(0, 300) : 'Change applied.',
  };
});
