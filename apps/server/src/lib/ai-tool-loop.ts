import { generateText, type CoreMessage, type LanguageModelV1, type ToolSet } from 'ai';

/**
 * Run a tool-using conversation one model step at a time.
 *
 * Newer Gemini models reject replayed function-call parts that lack their
 * "thought signature", which this SDK version does not round-trip. Feeding
 * tool results back as plain text keeps multi-step tool use working with any
 * provider.
 */
export async function generateWithTools({
  model,
  system,
  messages,
  tools,
  maxRounds = 4,
  maxTokens = 2_000,
  temperature,
  maxRetries,
}: {
  model: LanguageModelV1;
  system: string;
  messages: CoreMessage[];
  tools: ToolSet;
  maxRounds?: number;
  maxTokens?: number;
  temperature?: number;
  maxRetries?: number;
}): Promise<string> {
  const history: CoreMessage[] = [...messages];
  // A failing tool (for example an unavailable external service) must not sink
  // the whole answer; the model sees the error and carries on without it.
  const safeTools = Object.fromEntries(
    Object.entries(tools).map(([name, definition]) => [
      name,
      definition.execute
        ? {
            ...definition,
            execute: async (...args: Parameters<NonNullable<typeof definition.execute>>) => {
              try {
                return await definition.execute!(...args);
              } catch (error) {
                console.warn(`[ai-tool-loop] ${name} failed`, error);
                return { error: `${name} is unavailable right now.` };
              }
            },
          }
        : definition,
    ]),
  ) as ToolSet;
  for (let round = 0; round < maxRounds; round++) {
    const isLast = round === maxRounds - 1;
    const result = await generateText({
      model,
      system,
      messages: history,
      tools: safeTools,
      toolChoice: isLast ? 'none' : 'auto',
      maxSteps: 1,
      maxTokens,
      temperature,
      maxRetries,
    });
    if (!result.toolResults.length) return result.text.trim();
    const outcomes = (result.toolResults as Array<{ toolName: string; args: unknown; result: unknown }>).map((item) => ({
      tool: item.toolName,
      args: item.args,
      result: item.result,
    }));
    if (result.text.trim()) history.push({ role: 'assistant', content: result.text.trim() });
    history.push({
      role: 'user',
      content: [
        'Results of the tools you just called (JSON):',
        JSON.stringify(outcomes).slice(0, 60_000),
        'Continue with my previous request: call another tool if you still need information, otherwise give your complete final answer.',
      ].join('\n'),
    });
  }
  return '';
}
