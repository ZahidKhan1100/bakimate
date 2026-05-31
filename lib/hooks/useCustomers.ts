import NetInfo from "@react-native-community/netinfo";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createCustomer, deleteCustomer, fetchCustomersPage, patchCustomer } from "@/lib/customers-api";
import { enqueueCustomer, listPendingCustomerPayloads, mergePendingCustomersIntoPage } from "@/lib/customer-outbox";
import { useAppQueriesEnabled, withOfflineQueryDisplay } from "@/lib/hooks/useAppQueriesEnabled";
import { isNetInfoOffline, looksOfflineError } from "@/lib/network-offline";

import { Qk } from "@/lib/hooks/query-keys";

export function useCustomersPage(page = 1, options?: { enabled?: boolean }) {
  const enabled = useAppQueriesEnabled(options?.enabled ?? true);
  const q = useQuery({
    queryKey: Qk.customersPage(page),
    queryFn: () => fetchCustomersPage(page),
    enabled,
  });

  const q2 = useQuery({
    queryKey: Qk.outboxCustomersPending,
    queryFn: listPendingCustomerPayloads,
    enabled,
    staleTime: 5_000,
  });

  const merged = withOfflineQueryDisplay({
    ...q,
    data: mergePendingCustomersIntoPage(q.data, q2.data ?? []),
    isPending: q.isPending || q2.isPending,
    isFetching: q.isFetching || q2.isFetching,
  });

  return merged;
}

export type CreateCustomerResult = { queued: boolean; customer: Awaited<ReturnType<typeof createCustomer>> };

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      name: string;
      phone?: string | null;
    }): Promise<CreateCustomerResult> => {
      const net = await NetInfo.fetch();
      const queueOffline = async () => {
        const customer = await enqueueCustomer(payload);

        return { queued: true, customer };
      };

      if (isNetInfoOffline(net)) {
        return queueOffline();
      }

      try {
        const customer = await createCustomer(payload);

        return { queued: false, customer };
      } catch (e) {
        if (looksOfflineError(e)) {
          return queueOffline();
        }
        throw e;
      }
    },
    onSuccess: async (result) => {
      if (!result.queued) {
        qc.setQueryData(Qk.customer(result.customer.id), result.customer);
      }
      await qc.invalidateQueries({ queryKey: Qk.customers, exact: false });
      await qc.invalidateQueries({ queryKey: Qk.reportSummary });
      await qc.invalidateQueries({ queryKey: Qk.outboxCustomersPending });
    },
  });
}

export function useDeleteCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (customerId: number) => deleteCustomer(customerId),
    onSuccess: async (_, customerId) => {
      await qc.removeQueries({ queryKey: Qk.customer(customerId) });
      await qc.invalidateQueries({ queryKey: Qk.customers, exact: false });
      await qc.invalidateQueries({ queryKey: Qk.reportSummary });
    },
  });
}

export function usePatchCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { customerId: number; payload: Parameters<typeof patchCustomer>[1] }) =>
      patchCustomer(vars.customerId, vars.payload),
    onSuccess: async (_, vars) => {
      await qc.invalidateQueries({ queryKey: Qk.customer(vars.customerId) });
      await qc.invalidateQueries({ queryKey: Qk.customers, exact: false });
      await qc.invalidateQueries({ queryKey: Qk.reportSummary });
    },
  });
}
