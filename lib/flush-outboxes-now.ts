import { flushAllOutboxes } from "@/lib/customer-outbox";
import { Qk } from "@/lib/hooks/query-keys";
import { getOutboxSyncSummary, type OutboxSyncSummary } from "@/lib/transaction-outbox";
import { queryClient } from "@/lib/query-client";

export type FlushOutboxesOutcome = {
  flush: Awaited<ReturnType<typeof flushAllOutboxes>>;
  summary: OutboxSyncSummary;
};

/** User-initiated or foreground sync — invalidates ledger caches after flush. */
export async function flushOutboxesNow(): Promise<FlushOutboxesOutcome> {
  const flush = await flushAllOutboxes();

  await queryClient.invalidateQueries({ queryKey: Qk.reportSummary });
  await queryClient.invalidateQueries({ queryKey: Qk.insights });
  await queryClient.invalidateQueries({ queryKey: Qk.outboxPending });
  await queryClient.invalidateQueries({ queryKey: Qk.outboxCustomersPending });
  await queryClient.invalidateQueries({
    predicate: (q) =>
      Array.isArray(q.queryKey) &&
      (q.queryKey[0] === "customers" ||
        q.queryKey[0] === "customer" ||
        q.queryKey[0] === "outbox"),
  });

  const summary = await getOutboxSyncSummary();

  return { flush, summary };
}
