import { describe, expect, it } from 'vitest';
import { syncFolderSchema } from './sync-folder';

describe('on-demand sync folder input', () => {
  it('accepts Sent as the supported on-demand folder', () => {
    expect(syncFolderSchema.parse('sent')).toBe('sent');
  });

  it('rejects folders that should not be rebuilt by this action', () => {
    expect(() => syncFolderSchema.parse('inbox')).toThrow();
    expect(() => syncFolderSchema.parse('draft')).toThrow();
  });
});
