export const DEFAULT_GEMINI_COMPOSE_MODEL = 'gemini-3.5-flash-lite';

export const getGeminiGenerationSettings = (temperature = 0.35) => ({
  maxRetries: 1,
  temperature,
});

export const getGeminiComposeModelName = (
  configuredModel?: string,
  fallbackModel?: string,
): string => {
  return configuredModel?.trim() || fallbackModel?.trim() || DEFAULT_GEMINI_COMPOSE_MODEL;
};
