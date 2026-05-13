import { useQuery } from "@tanstack/react-query";

import { fetchReportSummary } from "@/lib/reports-api";

import { Qk } from "@/lib/hooks/query-keys";

export function useReportSummary(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: Qk.reportSummary,
    queryFn: fetchReportSummary,
    enabled: options?.enabled ?? true,
    staleTime: 20_000,
  });
}
