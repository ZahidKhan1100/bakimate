import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      /** Show last cached data when offline; refetch when back online. */
      networkMode: "offlineFirst",
      staleTime: 60_000,
      gcTime: 1_000 * 60 * 60 * 24,
      retry: 1,
    },
  },
});
