import { useQuery } from "@tanstack/react-query";

import { useAppQueriesEnabled, withOfflineQueryDisplay } from "@/lib/hooks/useAppQueriesEnabled";
import { fetchInsights } from "@/lib/reports-api";
import { Qk } from "@/lib/hooks/query-keys";
import { useSessionStore } from "@/stores/session-store";

export function useInsights() {
  const token = useSessionStore((s) => s.token);
  const enabled = useAppQueriesEnabled(Boolean(token));
  const q = useQuery({
    queryKey: Qk.insights,
    queryFn: fetchInsights,
    enabled,
    staleTime: 60 * 1000,
  });

  return withOfflineQueryDisplay(q);
}
