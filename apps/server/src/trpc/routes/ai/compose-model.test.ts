import { describe, expect, it } from 'vitest';

import {
  DEFAULT_GEMINI_COMPOSE_MODEL,
  getGeminiComposeModelName,
  getGeminiGenerationSettings,
} from './compose-model';

describe('getGeminiComposeModelName', () => {
  it('prefers an explicit compose model', () => {
    expect(getGeminiComposeModelName('gemini-custom', 'gemini-contact-import')).toBe('gemini-custom');
  });

  it('falls back to the configured contact-import model', () => {
    expect(getGeminiComposeModelName(undefined, 'gemini-contact-import')).toBe('gemini-contact-import');
  });

  it('uses the low-cost Gemini Flash Lite default', () => {
    expect(getGeminiComposeModelName()).toBe(DEFAULT_GEMINI_COMPOSE_MODEL);
  });

  it('does not send unsupported penalty parameters to Gemini Flash Lite', () => {
    expect(getGeminiGenerationSettings()).toEqual({
      maxRetries: 1,
      temperature: 0.35,
    });
  });
});
