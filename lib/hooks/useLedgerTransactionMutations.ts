import type { QueryClient } from "@tanstack/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { PatchTransactionPayload } from "@/lib/transactions-api";
import { patchCustomerTransaction, deleteCustomerTransaction } from "@/lib/transactions-api";
import { Qk } from "@/lib/hooks/query-keys";
import { assertRecordingPremiumOrThrow } from "@/lib/premium-recording-access";

async function invalidateLedgerViews(qc: QueryClient, customerId: number): Promise<void> {
  await qc.invalidateQueries({ queryKey: Qk.reportSummary });
  await qc.invalidateQueries({ queryKey: Qk.insights });
  await qc.invalidateQueries({
    predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === "customers",
  });
  await qc.invalidateQueries({ queryKey: Qk.customer(customerId) });
}

export function usePatchCustomerLedgerTransaction(customerId: number) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: PatchTransactionPayload & { transactionId: number }) => {
      await assertRecordingPremiumOrThrow();
      const { transactionId, ...body } = payload;
      return patchCustomerTransaction(transactionId, body);
    },
    onSuccess: async () => {
      await invalidateLedgerViews(qc, customerId);
    },
  });
}

export function useDeleteCustomerLedgerTransaction(customerId: number) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (transactionId: number) => {
      await assertRecordingPremiumOrThrow();
      return deleteCustomerTransaction(transactionId);
    },
    onSuccess: async () => {
      await invalidateLedgerViews(qc, customerId);
    },
  });
}
