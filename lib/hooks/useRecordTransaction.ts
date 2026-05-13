import type { QueryClient } from "@tanstack/react-query";
import NetInfo from "@react-native-community/netinfo";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

import { recordTransaction } from "@/lib/transactions-api";

import type { RecordTransactionResponse } from "@/lib/transactions-api";
import type { OutboxTransactionPayload } from "@/lib/transaction-outbox";
import { enqueueTransaction } from "@/lib/transaction-outbox";

import { Qk } from "@/lib/hooks/query-keys";
import { assertRecordingPremiumOrThrow } from "@/lib/premium-recording-access";

function looksOffline(e: unknown): boolean {
  if (axios.isAxiosError(e)) {
    if (e.code === "ERR_NETWORK" || !e.response) {
      return true;
    }
  }
  const msg =
    typeof e === "object" && e !== null && "message" in e ? String((e as { message?: unknown }).message) : "";

  return /network/i.test(msg);
}

async function invalidateAfterMutation(qc: QueryClient, customerId?: number): Promise<void> {
  await qc.invalidateQueries({ queryKey: Qk.reportSummary });
  await qc.invalidateQueries({ queryKey: Qk.insights });
  await qc.invalidateQueries({
    predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === "customers",
  });
  if (customerId !== undefined) {
    await qc.invalidateQueries({ queryKey: Qk.customer(customerId) });
  }
}

export type RecordTransactionMutationResult =
  | { queued: false; remote: RecordTransactionResponse }
  | { queued: true };

export function useRecordTransaction() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: OutboxTransactionPayload): Promise<RecordTransactionMutationResult> => {
      await assertRecordingPremiumOrThrow();

      const net = await NetInfo.fetch();
      const maybeOfflineEnqueue = async (): Promise<RecordTransactionMutationResult> => {
        await enqueueTransaction(payload);
        await invalidateAfterMutation(qc, payload.customer_id);
        return { queued: true };
      };

      if (net.isConnected === false || net.isInternetReachable === false) {
        return maybeOfflineEnqueue();
      }

      try {
        const remote = await recordTransaction(payload);
        await invalidateAfterMutation(qc, payload.customer_id);
        return { queued: false, remote };
      } catch (e) {
        if (looksOffline(e)) {
          return maybeOfflineEnqueue();
        }
        throw e;
      }
    },
  });
}
