import { useTRPC } from '@/providers/query-provider';
import { useQuery } from '@tanstack/react-query';

/** Designed email templates shared by the member's Yachtbase workspace. */
export function useWorkspaceTemplates() {
  const trpc = useTRPC();
  return useQuery(
    trpc.workspaceTemplates.list.queryOptions(void 0, {
      staleTime: 60 * 1000,
      retry: false,
      meta: { noGlobalError: true },
    }),
  );
}
