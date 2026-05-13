import { api } from "@/lib/api";
import type { Customer, TransactionCreated } from "@/lib/api-types";

import type { OutboxTransactionPayload } from "@/lib/transaction-outbox";

export type RecordTransactionResponse = {
  success: boolean;
  transaction: TransactionCreated;
  customer: Customer;
};

export async function recordTransaction(payload: OutboxTransactionPayload): Promise<RecordTransactionResponse> {
  const { data } = await api.post<RecordTransactionResponse>("/transactions", payload);
  return data;
}
