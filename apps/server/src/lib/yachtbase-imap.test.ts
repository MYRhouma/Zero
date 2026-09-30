import { describe, expect, it, vi } from 'vitest';

vi.mock('../env', () => ({ env: {} }));

const { actionForLabels } = await import('./yachtbase-imap');

describe('Yachtbase IMAP label actions', () => {
  it('maps Zero label changes to mailbox folder actions', () => {
    expect(actionForLabels(['TRASH'], ['INBOX'])).toBe('trash');
    expect(actionForLabels([], ['INBOX'])).toBe('archive');
    expect(actionForLabels(['INBOX'], [])).toBe('restore');
    expect(actionForLabels([], ['TRASH'])).toBe('restore');
    expect(actionForLabels([], ['UNREAD'])).toBe('read');
    expect(actionForLabels(['UNREAD'], [])).toBe('unread');
    expect(actionForLabels(['STARRED'], [])).toBe('star');
    expect(actionForLabels([], ['IMPORTANT'])).toBe('unimportant');
    expect(actionForLabels(['CUSTOM'], [])).toBeNull();
  });
});
