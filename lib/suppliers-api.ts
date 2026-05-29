import { api } from "@/lib/api";
import type {
  LaravelPaginator,
  Supplier,
  SupplierDetail,
  SupplierTransactionCreated,
} from "@/lib/api-types";

export async function fetchSuppliersPage(page = 1): Promise<LaravelPaginator<Supplier>> {
  const { data } = await api.get<LaravelPaginator<Supplier>>("/suppliers", { params: { page } });
  return data;
}

export async function fetchSupplier(id: number): Promise<SupplierDetail> {
  const { data } = await api.get<SupplierDetail>(`/suppliers/${id}`);
  return data;
}

export async function createSupplier(payload: { name: string; phone?: string | null }): Promise<Supplier> {
  const { data } = await api.post<Supplier>("/suppliers", payload);
  return data;
}

export async function deleteSupplier(id: number): Promise<void> {
  await api.delete(`/suppliers/${id}`);
}

export async function recordSupplierLedgerEntry(payload: {
  supplier_id: number;
  amount_sen: number;
  type: "purchase" | "payment_out";
  note?: string | null;
}): Promise<SupplierTransactionCreated> {
  const { data } = await api.post("/supplier-transactions", payload);
  return data;
}
