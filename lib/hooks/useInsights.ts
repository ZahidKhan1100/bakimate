import { useQuery } from "@tanstack/react-query";

import { fetchInsights } from "@/lib/reports-api";
import { Qk } from "@/lib/hooks/query-keys";
import { useSessionStore } from "@/stores/session-store";

export function useInsights() {
  const token = useSessionStore((s) => s.token);

  return useQuery({
    queryKey: Qk.insights,
    queryFn: fetchInsights,
    enabled: Boolean(token),
    staleTime: 60 * 1000,
  });
}
