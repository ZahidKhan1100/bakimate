import { useIsRestoring, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { api } from "@/lib/api";
import type { Customer } from "@/lib/api-types";
import { pickCustomerFromQueryCaches } from "@/lib/entity-query-fallback";

import { Qk } from "@/lib/hooks/query-keys";

/** Re-render when list or detail cache entries we care about change (e.g. persist completes). */
function useCustomerFallbackVersion(queryClient: ReturnType<typeof useQueryClient>, customerId: number): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    return queryClient.getQueryCache().subscribe((event) => {
      const key = event.query?.queryKey;
      if (!Array.isArray(key)) {
        return;
      }
      if (key[0] === "customers" || (key[0] === "customer" && key[1] === customerId)) {
        setV((n) => n + 1);
      }
    });
  }, [queryClient, customerId]);
  return v;
}

export function useCustomer(customerId: number, options?: { enabled?: boolean }) {
  const qc = useQueryClient();
  const fv = useCustomerFallbackVersion(qc, customerId);
  const isRestoring = useIsRestoring();
  const q = useQuery({
    queryKey: Qk.customer(customerId),
    queryFn: async () => {
      const { data } = await api.get<Customer>(`/customers/${customerId}`);
      return data;
    },
    enabled: (options?.enabled ?? true) && customerId > 0 && !isRestoring,
    staleTime: 30_000,
  });

  const listFallback = useMemo(() => pickCustomerFromQueryCaches(qc, customerId), [qc, customerId, fv]);
  const data = q.data ?? listFallback ?? undefined;
  /** No full detail response yet; UI may be missing promises / recent tx until online. */
  const isPartialListFallback = !q.data && Boolean(listFallback);

  return {
    ...q,
    data,
    /** Spinner only when we have nothing to show (no API row and no list/cache row). */
    isLoading: q.isPending && !data,
    isPartialListFallback,
  };
}
