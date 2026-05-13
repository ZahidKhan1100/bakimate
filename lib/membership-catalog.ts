import type { PurchasesPackage } from "react-native-purchases";

/** Free trial length — configure matching intro offer / free trial in App Store Connect + RevenueCat. */
export const MEMBERSHIP_TRIAL_DAYS = 7;

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
    const ka = PACKAGE_RANK[String(a.packageType).toUpperCase()] ?? 99;
    const kb = PACKAGE_RANK[String(b.packageType).toUpperCase()] ?? 99;

    return ka - kb;
  });
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

export function isAnnualMembershipPackage(pkg: PurchasesPackage): boolean {
  return String(pkg.packageType).toUpperCase() === "ANNUAL";
}
