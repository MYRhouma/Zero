import { describe, expect, it, vi } from 'vitest';

import { getVectorMetadata } from './brain-vector';

describe('getVectorMetadata', () => {
  it('returns vector metadata when the lookup succeeds', async () => {
    const index = {
      getByIds: vi.fn().mockResolvedValue([{ metadata: { summary: 'A summary' } }]),
    };

    await expect(getVectorMetadata(index, 'thread-1')).resolves.toEqual({ summary: 'A summary' });
  });

  it('returns null when Vectorize is unavailable', async () => {
    const index = {
      getByIds: vi.fn().mockRejectedValue(new Error('VECTOR_GET_ERROR')),
    };

    await expect(getVectorMetadata(index, 'thread-1')).resolves.toBeNull();
  });
});
