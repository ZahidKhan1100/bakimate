import type { PurchasesOffering, PurchasesOfferings } from "react-native-purchases";

import { getRevenueCatOfferingIdentifier } from "@/lib/revenuecat-settings";

/**
 * Picks packages source for the paywall. Uses `offerings.current` unless
 * `EXPO_PUBLIC_REVENUECAT_OFFERING_ID` matches an entry in `offerings.all`.
 */
export function selectPaywallOffering(offerings: PurchasesOfferings): {
  offering: PurchasesOffering | null;
  source: "configured" | "current" | "none";
  requestedKey: string | null;
} {
  const requestedRaw = getRevenueCatOfferingIdentifier();
  const requestedKey = requestedRaw.trim() !== "" ? requestedRaw.trim() : null;

  const all = offerings.all;
  const current = offerings.current;

  if (requestedKey !== null && all !== null && all[requestedKey] != null) {
    const o = all[requestedKey];

    return { offering: o as PurchasesOffering, source: "configured", requestedKey };
  }

  if (__DEV__ && requestedKey !== null) {
    const keys = Object.keys(all ?? {}).join(", ") || "(empty)";
    console.warn(
      `[BakiMate][RevenueCat] Offering "${requestedKey}" not found in offerings.all. Available keys: ${keys}. Using offerings.current instead.`,
    );
  }

  if (current != null) {
    return { offering: current, source: "current", requestedKey };
  }

  return { offering: null, source: "none", requestedKey };
}
