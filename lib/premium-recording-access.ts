import { Platform } from "react-native";
import Purchases from "react-native-purchases";

import { PremiumRecordingBlockedError } from "@/lib/errors/premium-recording-blocked-error";
import { ensureRevenueCatConfigured } from "@/lib/revenuecat-configure";
import { getNativeRevenueCatApiKey, getPremiumEntitlementIdentifier } from "@/lib/revenuecat-settings";

/** Result shared by TanStack Query and the recording mutation gate. */
export type PremiumRecordingAccess = {
  /**
   * When false, subscription is not enforced (web, missing SDK keys, configure/getCustomerInfo failed).
   * When true, `entitled` must be true to record credits/payments via the SDK-guarded path.
   */
  requiresPremium: boolean;
  entitled: boolean;
};

/**
 * Inspect RevenueCat `CustomerInfo` for the entitlement in app config (`revenueCatPremiumEntitlementId`; default aligned to BakiMate Pro).
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

  try {
    const info = await Purchases.getCustomerInfo();
    const entitled = Boolean(info.entitlements.active[entitlementId]);

    if (__DEV__) {
      const activeIds = Object.keys(info.entitlements.active);
      console.warn(
        "[BakiMate]",
        `RevenueCat: looking for entitlement "${entitlementId}"; active IDs:`,
        activeIds.length > 0 ? activeIds.join(", ") : "(none)",
      );
    }

    return { requiresPremium: true, entitled };
  } catch {
    /** Fail open if RC is unreachable so paying users aren’t fully blocked offline. */
    return { requiresPremium: false, entitled: false };
  }
}

export async function assertRecordingPremiumOrThrow(): Promise<void> {
  const s = await fetchPremiumRecordingAccess();

  if (s.requiresPremium && !s.entitled) {
    throw new PremiumRecordingBlockedError();
  }
}
