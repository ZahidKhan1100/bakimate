import { api } from "@/lib/api";
import type { Customer, TransactionCreated } from "@/lib/api-types";

import type { OutboxTransactionPayload } from "@/lib/transaction-outbox";

export type RecordTransactionResponse = {
  success: boolean;
  transaction: TransactionCreated;
  customer: Customer;
};

export type PatchTransactionPayload = {
  amount_sen: number;
  note: string | null;
  item_key: string | null;
};

export type PatchTransactionResponse = {
  success: boolean;
  transaction: TransactionCreated;
  customer: Customer;
};

export type DeleteTransactionResponse = {
  success: boolean;
  customer: Customer;
};

export async function recordTransaction(payload: OutboxTransactionPayload): Promise<RecordTransactionResponse> {
  const { data } = await api.post<RecordTransactionResponse>("/transactions", payload);
  return data;
}

export async function patchCustomerTransaction(
  transactionId: number,
  payload: PatchTransactionPayload,
): Promise<PatchTransactionResponse> {
  const { data } = await api.patch<PatchTransactionResponse>(`/transactions/${transactionId}`, payload);
  return data;
}

export async function deleteCustomerTransaction(transactionId: number): Promise<DeleteTransactionResponse> {
  const { data } = await api.delete<DeleteTransactionResponse>(`/transactions/${transactionId}`);
  return data;
}
