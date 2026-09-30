import { describe, expect, it } from 'vitest';
import { MockLanguageModelV1 } from 'ai/test';
import { tool, type ToolSet } from 'ai';
import { z } from 'zod';
import { generateWithTools } from './ai-tool-loop';

const step = (content: object) => ({
  rawCall: { rawPrompt: null, rawSettings: {} }, finishReason: 'stop' as const,
  usage: { promptTokens: 1, completionTokens: 1 }, ...content,
});

describe('generateWithTools', () => {
  it('feeds tool results back as text and tolerates failing tools', async () => {
    const prompts: string[] = [];
    let call = 0;
    const model = new MockLanguageModelV1({
      doGenerate: async ({ prompt }) => {
        prompts.push(JSON.stringify(prompt));
        call += 1;
        return call === 1
          ? step({ toolCalls: [{ toolCallType: 'function', toolCallId: '1', toolName: 'lookup', args: '{"q":"x"}' }], finishReason: 'tool-calls' })
          : step({ text: 'Final answer' });
      },
    });
    const text = await generateWithTools({
      model, system: 'sys', messages: [{ role: 'user', content: 'hi' }],
      tools: { lookup: tool({ parameters: z.object({ q: z.string() }), execute: async () => { throw new Error('down'); } }) } as ToolSet,
    });
    expect(text).toBe('Final answer');
    expect(prompts[1]).toContain('lookup is unavailable right now.');
    expect(prompts[1]).not.toContain('tool-call');
  });
});
