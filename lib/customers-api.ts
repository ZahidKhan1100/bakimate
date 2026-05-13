import { api } from "@/lib/api";
import type { Customer, LaravelPaginator } from "@/lib/api-types";

export async function fetchCustomersPage(page = 1): Promise<LaravelPaginator<Customer>> {
  const { data } = await api.get<LaravelPaginator<Customer>>("/customers", {
    params: { page },
  });
  return data;
}

export async function createCustomer(payload: {
  name: string;
  phone?: string | null;
}): Promise<Customer> {
  const { data } = await api.post<Customer>("/customers", payload);
  return data;
}

export async function deleteCustomer(customerId: number): Promise<void> {
  await api.delete(`/customers/${customerId}`);
}

export async function patchCustomer(
  customerId: number,
  payload: Partial<{
    name: string;
    phone: string | null;
    goal_amount_sen: number | null;
    goal_target_date: string | null;
  }>,
): Promise<Customer> {
  const { data } = await api.patch<Customer>(`/customers/${customerId}`, payload);
  return data;
}

export async function rotateCustomerBalancePublicLink(
  customerId: number,
): Promise<{ url: string; path?: string }> {
  const { data } = await api.post<{ url: string; path?: string }>(
    `/customers/${customerId}/balance-public-link`,
    {},
  );
  return data;
}
