import { useQuery } from "@tanstack/react-query";

import { Qk } from "@/lib/hooks/query-keys";
import { pendingCountForCustomer } from "@/lib/transaction-outbox";

export function useOutboxPendingForCustomer(customerId: number, enabled = true) {
  return useQuery({
    queryKey: Qk.outboxCustomer(customerId),
    queryFn: () => pendingCountForCustomer(customerId),
    enabled: enabled && customerId > 0,
    staleTime: 2_500,
    refetchInterval: 12_000,
  });
}
