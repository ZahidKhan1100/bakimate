import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createCustomer, deleteCustomer, fetchCustomersPage } from "@/lib/customers-api";

import { Qk } from "@/lib/hooks/query-keys";

export function useCustomersPage(page = 1, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: Qk.customersPage(page),
    queryFn: () => fetchCustomersPage(page),
    enabled: options?.enabled ?? true,
  });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createCustomer,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: Qk.customers, exact: false });
      await qc.invalidateQueries({ queryKey: Qk.reportSummary });
    },
  });
}

export function useDeleteCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteCustomer,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: Qk.customers, exact: false });
      await qc.invalidateQueries({ queryKey: Qk.reportSummary });
    },
  });
}
