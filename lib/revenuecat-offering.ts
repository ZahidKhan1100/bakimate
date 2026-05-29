import type { PurchasesOffering, PurchasesOfferings, PurchasesPackage } from "react-native-purchases";

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

/**
 * After primary {@link selectPaywallOffering}, if that offering has **zero** `availablePackages`
 * (stale env id, template offering, or products not yet synced to that row) but another offering
 * does have packages, use the first useful fallback so the paywall can still render.
 *
 * Does **not** fix App Store Connect / StoreKit returning no products for **all** offerings.
 */
export function resolvePaywallPackages(offers: PurchasesOfferings): {
  packages: PurchasesPackage[];
  offering: PurchasesOffering | null;
  logLabel: string;
} {
  const primary = selectPaywallOffering(offers);
  let offering = primary.offering;
  let pkgs = offering?.availablePackages ?? [];
  let logLabel = `${primary.source}${primary.requestedKey ? `:${primary.requestedKey}` : ""} → ${pkgs.length} pkg(s)`;

  if (pkgs.length === 0 && primary.source === "configured" && offers.current != null) {
    const cur = offers.current;
    const curPkgs = cur.availablePackages ?? [];
    if (curPkgs.length > 0) {
      offering = cur;
      pkgs = curPkgs;
      logLabel += ` | fallback→current (${pkgs.length})`;
    }
  }

  if (pkgs.length === 0 && offers.all != null) {
    let best: PurchasesOffering | null = null;
    let bestN = 0;
    for (const k of Object.keys(offers.all)) {
      const o = offers.all[k] as PurchasesOffering;
      const n = o.availablePackages?.length ?? 0;
      if (n > bestN) {
        bestN = n;
        best = o;
      }
    }
    if (best != null && bestN > 0) {
      offering = best;
      pkgs = best.availablePackages ?? [];
      logLabel += ` | fallback→"${best.identifier}" (${pkgs.length})`;
    }
  }

  return { packages: pkgs, offering, logLabel };
}
