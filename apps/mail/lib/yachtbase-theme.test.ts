import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('Yachtbase email theme tokens', () => {
  it('maps email tokens to Yachtbase visual values', async () => {
    const css = await readFile(new URL('../app/globals.css', import.meta.url), 'utf8');

    expect(css).toContain('--font-yachtbase-sans');
    expect(css).toContain('--primary:');
    expect(css).toContain('--sidebar-background:');
    expect(css).not.toMatch(/Mail-0|Zero pricing|YC startup/);
  });
});
