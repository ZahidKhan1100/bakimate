import type { PurchasesPackage } from "react-native-purchases";

/** Free trial length — configure matching intro offer / free trial in App Store Connect + Play Console + RevenueCat. */
export const MEMBERSHIP_TRIAL_DAYS = 30;

/**
 * Target US pricing (merchant reference). Actual paid amount is whatever you set in
 * App Store Connect / Play Console — shown to users via `product.priceString` from the stores.
 *
 * Recommended mapping in RevenueCat: default offering packs $rc_monthly, $rc_three_month,
 * $rc_six_month, $rc_annual with products priced at roughly these USD amounts.
 */
export const MEMBERSHIP_USD_PRICE_TARGETS = {
  monthly: 5,
  threeMonths: 12,
  sixMonths: 22,
  annual: 35,
} as const;

/** Display order on the paywall (left / top first). Unknown package types sort last. */
const PACKAGE_RANK: Partial<Record<string, number>> = {
  MONTHLY: 0,
  THREE_MONTH: 1,
  SIX_MONTH: 2,
  ANNUAL: 3,
  TWO_MONTH: 10,
  WEEKLY: 11,
};

export function sortMembershipPackages(pkgs: PurchasesPackage[]): PurchasesPackage[] {
  return [...pkgs].sort((a, b) => {
    const ra = resolvedMembershipPackageTier(a);
    const rb = resolvedMembershipPackageTier(b);
    const ka =
      ra != null
        ? (PACKAGE_RANK[membershipTierToPackageTypeKey(ra)] ?? 99)
        : (PACKAGE_RANK[String(a.packageType).toUpperCase()] ?? 99);
    const kb =
      rb != null
        ? (PACKAGE_RANK[membershipTierToPackageTypeKey(rb)] ?? 99)
        : (PACKAGE_RANK[String(b.packageType).toUpperCase()] ?? 99);

    return ka - kb;
  });
}

function membershipTierToPackageTypeKey(
  tier: keyof typeof MEMBERSHIP_USD_PRICE_TARGETS,
): keyof typeof PACKAGE_RANK {
  switch (tier) {
    case "monthly":
      return "MONTHLY";
    case "threeMonths":
      return "THREE_MONTH";
    case "sixMonths":
      return "SIX_MONTH";
    case "annual":
      return "ANNUAL";
    default:
      return "MONTHLY";
  }
}

export function membershipPackageTier(pkg: PurchasesPackage): keyof typeof MEMBERSHIP_USD_PRICE_TARGETS | null {
  const p = String(pkg.packageType).toUpperCase();
  switch (p) {
    case "MONTHLY":
      return "monthly";
    case "THREE_MONTH":
      return "threeMonths";
    case "SIX_MONTH":
      return "sixMonths";
    case "ANNUAL":
      return "annual";
    default:
      return null;
  }
}

/**
 * When packages are attached in RevenueCat with custom identifiers, `packageType` is often
 * CUSTOM/UNKNOWN even though the Store product is a normal subscription. Map known product
 * / package ids so the paywall still gets tier labels and sort order.
 */
function inferMembershipTierFromIdentifiers(pkg: PurchasesPackage): keyof typeof MEMBERSHIP_USD_PRICE_TARGETS | null {
  const parts = [pkg.product.identifier, pkg.identifier]
    .filter((s) => typeof s === "string" && s.trim() !== "")
    .map((s) => s.toLowerCase());
  const hay = parts.join(" ");

  if (
    hay.includes("yearly") ||
    hay.includes("annual") ||
    hay.endsWith(".year") ||
    /(^|\.)1y($|\.)/.test(hay)
  ) {
    return "annual";
  }
  if (hay.includes("6month") || hay.includes("six_month") || hay.includes("sixmonth")) {
    return "sixMonths";
  }
  if (hay.includes("3month") || hay.includes("three_month") || hay.includes("threemonth")) {
    return "threeMonths";
  }
  if (hay.includes("monthly") || hay.includes(".month") || /(^|\.)1m($|\.)/.test(hay)) {
    return "monthly";
  }

  return null;
}

/** Resolved tier from RevenueCat package type and/or Store product / package identifiers. */
export function resolvedMembershipPackageTier(
  pkg: PurchasesPackage,
): keyof typeof MEMBERSHIP_USD_PRICE_TARGETS | null {
  return membershipPackageTier(pkg) ?? inferMembershipTierFromIdentifiers(pkg);
}

export function isAnnualMembershipPackage(pkg: PurchasesPackage): boolean {
  if (String(pkg.packageType).toUpperCase() === "ANNUAL") {
    return true;
  }
  return resolvedMembershipPackageTier(pkg) === "annual";
}
