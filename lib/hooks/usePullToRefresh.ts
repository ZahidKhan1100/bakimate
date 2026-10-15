import { useCallback, useRef, useState } from "react";

const REFRESH_TIMEOUT_MS = 15_000;

/**
 * Pull-to-refresh spinner — only for user pulls, not background query refetches.
 * Clears after refetch finishes or times out so the indicator cannot stick forever.
 */
export function usePullToRefresh(refetch: () => Promise<unknown>) {
  const [refreshing, setRefreshing] = useState(false);
  const inFlight = useRef(false);

  const onRefresh = useCallback(() => {
    if (inFlight.current) {
      return;
    }
    inFlight.current = true;
    setRefreshing(true);

    const timeoutId = setTimeout(() => {
      inFlight.current = false;
      setRefreshing(false);
    }, REFRESH_TIMEOUT_MS);

    void (async () => {
      try {
        await refetch();
      } catch {
        /* offline / API errors — still dismiss spinner */
      } finally {
        clearTimeout(timeoutId);
        inFlight.current = false;
        setRefreshing(false);
      }
    })();
  }, [refetch]);

  return { refreshing, onRefresh };
}
