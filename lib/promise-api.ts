import { api } from "@/lib/api";
import type { CustomerPromise } from "@/lib/api-types";

export type CreateCustomerPromiseBody = {
  amount_sen: number;
  /** YYYY-MM-DD */
  promised_date: string;
  note?: string | null;
};

export type UpdateCustomerPromiseBody = {
  status: "pending" | "kept" | "missed" | "cancelled";
};

export async function createCustomerPromise(
  customerId: number,
  body: CreateCustomerPromiseBody,
): Promise<CustomerPromise> {
  const { data } = await api.post<CustomerPromise>(`/customers/${customerId}/promises`, body);
  return data;
}

export async function updateCustomerPromise(
  customerId: number,
  promiseId: number,
  body: UpdateCustomerPromiseBody,
): Promise<CustomerPromise> {
  const { data } = await api.patch<CustomerPromise>(`/customers/${customerId}/promises/${promiseId}`, body);

  return data;
}
