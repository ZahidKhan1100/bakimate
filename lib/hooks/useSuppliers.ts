import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Qk } from "@/lib/hooks/query-keys";
import {
  createSupplier,
  deleteSupplier,
  fetchSupplier,
  fetchSuppliersPage,
  recordSupplierLedgerEntry,
} from "@/lib/suppliers-api";

export function useSuppliersPage(page = 1, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: Qk.suppliersPage(page),
    queryFn: () => fetchSuppliersPage(page),
    enabled: options?.enabled ?? true,
  });
}

export function useSupplier(supplierId: number, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: Qk.supplier(supplierId),
    queryFn: () => fetchSupplier(supplierId),
    enabled: (options?.enabled ?? true) && supplierId > 0,
    staleTime: 15_000,
  });
}

export function useCreateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createSupplier,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["suppliers"], exact: false });
    },
  });
}

export function useDeleteSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteSupplier,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["suppliers"], exact: false });
    },
  });
}

export function useRecordSupplierLedger() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      supplier_id: number;
      amount_sen: number;
      type: "purchase" | "payment_out";
      note?: string | null;
    }) => {
      const { assertRecordingPremiumOrThrow } = await import("@/lib/premium-recording-access");
      await assertRecordingPremiumOrThrow();

      return recordSupplierLedgerEntry(payload);
    },
    onSuccess: async (_data, vars) => {
      await qc.invalidateQueries({ queryKey: Qk.supplier(vars.supplier_id) });
      await qc.invalidateQueries({ queryKey: ["suppliers"], exact: false });
    },
  });
}
