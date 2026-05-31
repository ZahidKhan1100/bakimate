import { Platform } from "react-native";
import Purchases from "react-native-purchases";

import { PremiumRecordingBlockedError } from "@/lib/errors/premium-recording-blocked-error";
import { Qk } from "@/lib/hooks/query-keys";
import { ensureRevenueCatConfigured } from "@/lib/revenuecat-configure";
import { queryClient } from "@/lib/query-client";
import { getNativeRevenueCatApiKey, getPremiumEntitlementIdentifier } from "@/lib/revenuecat-settings";
import { fetchIsDeviceOffline } from "@/lib/network-offline";
import { fetchShopProfile } from "@/lib/shop-api";

/** Result shared by TanStack Query and the recording mutation gate. */
export type PremiumRecordingAccess = {
  /**
   * When false, subscription is not enforced (web, missing SDK keys, configure/getCustomerInfo failed).
   * When true, `entitled` must be true to record credits/payments via the SDK-guarded path.
   */
  requiresPremium: boolean;
  /**
   * Recording allowed when RevenueCat entitlement is active **or** the server reports an active subscription
   * (`GET /shop` → `subscription_active`, e.g. signup trial windows set in Laravel).
   */
  entitled: boolean;
};

async function fetchServerSubscriptionActive(): Promise<boolean> {
  try {
    const shop = await queryClient.fetchQuery({
      queryKey: Qk.shopProfile,
      /** Short timeout: this runs in parallel with RevenueCat; long hangs block offline recording UX. */
      queryFn: () => fetchShopProfile({ timeoutMs: 6_000 }),
      staleTime: 30_000,
    });
    return shop.subscription_active === true;
  } catch {
    return false;
  }
}

/**
 * Merges RevenueCat entitlements with the server shop subscription (`subscription_active` includes signup trial until `subscription_expires_at`).
 */
export async function fetchPremiumRecordingAccess(): Promise<PremiumRecordingAccess> {
  if (Platform.OS === "web") {
    return { requiresPremium: false, entitled: false };
  }

  if (!getNativeRevenueCatApiKey()) {
    return { requiresPremium: false, entitled: false };
  }

  const ready = await ensureRevenueCatConfigured();
  if (!ready) {
    return { requiresPremium: false, entitled: false };
  }

  const entitlementId = getPremiumEntitlementIdentifier();
  /** Load `/shop` in parallel so signup trial resolves without doubling latency after RC returns. */
  const serverTrialPromise = fetchServerSubscriptionActive();

  try {
    const info = await Purchases.getCustomerInfo();
    const rcEntitled = Boolean(info.entitlements.active[entitlementId]);

    if (__DEV__) {
      const activeIds = Object.keys(info.entitlements.active);
      console.warn(
        "[BakiMate]",
        `RevenueCat: looking for entitlement "${entitlementId}"; active IDs:`,
        activeIds.length > 0 ? activeIds.join(", ") : "(none)",
      );
    }

    const serverTrial = await serverTrialPromise;

    return { requiresPremium: true, entitled: rcEntitled || serverTrial };
  } catch {
    /** Fail open if RC is unreachable so paying users aren’t fully blocked offline. */
    const serverTrial = await serverTrialPromise;
    const entitled = serverTrial;
    return { requiresPremium: false, entitled };
  }
}

export async function assertRecordingPremiumOrThrow(): Promise<void> {
  /** Queue-first offline recording: enforce subscription when we can reach the server, not on-device only. */
  if (await fetchIsDeviceOffline()) {
    return;
  }

  const s = await fetchPremiumRecordingAccess();

  if (s.requiresPremium && !s.entitled) {
    throw new PremiumRecordingBlockedError();
  }
}
