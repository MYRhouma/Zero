import { z } from 'zod';

/** Folders that can be refreshed without rebuilding the local mailbox index. */
export const syncFolderSchema = z.literal('sent');
export type SyncFolder = z.infer<typeof syncFolderSchema>;
