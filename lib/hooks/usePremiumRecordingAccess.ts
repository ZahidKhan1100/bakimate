import { useQuery } from "@tanstack/react-query";
import { Platform } from "react-native";

import { fetchPremiumRecordingAccess } from "@/lib/premium-recording-access";
import { Qk } from "@/lib/hooks/query-keys";
import { getNativeRevenueCatApiKey } from "@/lib/revenuecat-settings";

/**
 * RevenueCat entitlement used to gate credit/payment recording on native when SDK keys are set.
 */
export function usePremiumRecordingAccess(enabled: boolean) {
  const hasRcKey = Boolean(getNativeRevenueCatApiKey());
  const shouldQuery = enabled && Platform.OS !== "web" && hasRcKey;

  return useQuery({
    queryKey: Qk.premiumRecordingAccess,
    enabled: shouldQuery,
    queryFn: fetchPremiumRecordingAccess,
    staleTime: 0,
    gcTime: 1000 * 60 * 5,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
}
