import { useIsRestoring } from "@tanstack/react-query";
import type { UseQueryResult } from "@tanstack/react-query";

import { useSessionHydrated } from "@/hooks/use-session-hydrated";

/** Wait for Zustand session + TanStack persist restore before hitting the API. */
export function useAppQueriesEnabled(sessionEnabled = true): boolean {
  const hydrated = useSessionHydrated();
  const isRestoring = useIsRestoring();

  return sessionEnabled && hydrated && !isRestoring;
}

/** Keep showing last successful payload when a background refetch fails (e.g. offline). */
export function withOfflineQueryDisplay<T>(q: UseQueryResult<T>): UseQueryResult<T> {
  const hasData = q.data !== undefined && q.data !== null;

  return {
    ...q,
    isLoading: q.isPending && !hasData,
  };
}
