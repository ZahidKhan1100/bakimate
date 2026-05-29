import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useAppQueriesEnabled, withOfflineQueryDisplay } from "@/lib/hooks/useAppQueriesEnabled";
import { pickReportSummaryFromCustomerCaches } from "@/lib/report-summary-fallback";
import { fetchReportSummary } from "@/lib/reports-api";

import { Qk } from "@/lib/hooks/query-keys";

export function useReportSummary(options?: { enabled?: boolean }) {
  const qc = useQueryClient();
  const enabled = useAppQueriesEnabled(options?.enabled ?? true);
  const q = useQuery({
    queryKey: Qk.reportSummary,
    queryFn: fetchReportSummary,
    enabled,
    staleTime: 20_000,
  });

  const data = q.data ?? pickReportSummaryFromCustomerCaches(qc);

  return withOfflineQueryDisplay({ ...q, data });
}
