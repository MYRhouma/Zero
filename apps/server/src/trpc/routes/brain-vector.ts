type VectorMetadata = Record<string, unknown>;

type VectorIndexLike = {
  getByIds(ids: string[]): Promise<Array<{ metadata?: VectorMetadata }>>;
};

export async function getVectorMetadata(
  index: VectorIndexLike,
  threadId: string,
): Promise<VectorMetadata | null> {
  try {
    const response = await index.getByIds([threadId]);
    return response[0]?.metadata ?? null;
  } catch (error) {
    console.warn(`[brain] Vectorize lookup unavailable for ${threadId}`, error);
    return null;
  }
}
