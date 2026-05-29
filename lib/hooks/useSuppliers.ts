import { useMutation, useIsRestoring, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { pickSupplierFromQueryCaches } from "@/lib/entity-query-fallback";
import { useAppQueriesEnabled, withOfflineQueryDisplay } from "@/lib/hooks/useAppQueriesEnabled";
import { Qk } from "@/lib/hooks/query-keys";
import {
  createSupplier,
  deleteSupplier,
  fetchSupplier,
  fetchSuppliersPage,
  recordSupplierLedgerEntry,
} from "@/lib/suppliers-api";

function useSupplierFallbackVersion(queryClient: ReturnType<typeof useQueryClient>, supplierId: number): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    return queryClient.getQueryCache().subscribe((event) => {
      const key = event.query?.queryKey;
      if (!Array.isArray(key)) {
        return;
      }
      if (key[0] === "suppliers" || (key[0] === "supplier" && key[1] === supplierId)) {
        setV((n) => n + 1);
      }
    });
  }, [queryClient, supplierId]);
  return v;
}

export function useSuppliersPage(page = 1, options?: { enabled?: boolean }) {
  const enabled = useAppQueriesEnabled(options?.enabled ?? true);
  const q = useQuery({
    queryKey: Qk.suppliersPage(page),
    queryFn: () => fetchSuppliersPage(page),
    enabled,
  });

  return withOfflineQueryDisplay(q);
}

export function useSupplier(supplierId: number, options?: { enabled?: boolean }) {
  const qc = useQueryClient();
  const fv = useSupplierFallbackVersion(qc, supplierId);
  const isRestoring = useIsRestoring();
  const q = useQuery({
    queryKey: Qk.supplier(supplierId),
    queryFn: () => fetchSupplier(supplierId),
    enabled: (options?.enabled ?? true) && supplierId > 0 && !isRestoring,
    staleTime: 15_000,
  });

  const listFallback = useMemo(() => pickSupplierFromQueryCaches(qc, supplierId), [qc, supplierId, fv]);
  const data = q.data ?? listFallback ?? undefined;
  const isPartialListFallback = !q.data && Boolean(listFallback);

  return {
    ...q,
    data,
    isLoading: q.isPending && !data,
    isPartialListFallback,
  };
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
