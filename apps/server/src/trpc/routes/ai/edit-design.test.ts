import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../env', () => ({ env: {} }));
vi.mock('../../../lib/yachtbase-sender-identity', () => ({ senderForConnection: vi.fn() }));
vi.mock('../../trpc', () => ({ activeConnectionProcedure: { input: () => ({ mutation: () => ({}) }) } }));

const { sanitizeEmailHtml, parseModelJson, applyEdits } = await import('./edit-design');

describe('AI design edits', () => {
  it('strips scripts, event handlers and script links', () => {
    const html = sanitizeEmailHtml(
      '<p onclick="x()">Hi</p><script>alert(1)</script><a href="javascript:alert(1)">x</a><iframe src="https://e.test"></iframe><img src="https://e.test/a.png">',
    );
    expect(html).toBe('<p>Hi</p><a href="#">x</a><img src="https://e.test/a.png">');
  });

  it('reads JSON wrapped in code fences or prose', () => {
    expect(parseModelJson('Sure!\n```json\n{"summary":"ok","html":"<p>a</p>"}\n```')).toEqual({ summary: 'ok', html: '<p>a</p>' });
    expect(() => parseModelJson('no json here')).toThrow();
  });

  it('applies exact edits and counts misses', () => {
    const result = applyEdits('<h1>Old title</h1><a>Go</a>', [
      { find: 'Old title', replace: 'New title' },
      { find: 'missing', replace: 'x' },
    ]);
    expect(result).toEqual({ html: '<h1>New title</h1><a>Go</a>', applied: 1, missed: 1 });
  });
});
