import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { Customer } from "@/lib/api-types";

import { Qk } from "@/lib/hooks/query-keys";

export function useCustomer(customerId: number, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: Qk.customer(customerId),
    queryFn: async () => {
      const { data } = await api.get<Customer>(`/customers/${customerId}`);
      return data;
    },
    enabled: (options?.enabled ?? true) && customerId > 0,
    staleTime: 30_000,
  });
}
