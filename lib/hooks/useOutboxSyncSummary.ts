import { useQuery } from "@tanstack/react-query";

import { Qk } from "@/lib/hooks/query-keys";
import { getOutboxSyncSummary } from "@/lib/transaction-outbox";

export function useOutboxSyncSummary(enabled = true) {
  return useQuery({
    queryKey: Qk.outboxPending,
    queryFn: getOutboxSyncSummary,
    enabled,
    staleTime: 3_000,
    refetchInterval: 10_000,
  });
}
