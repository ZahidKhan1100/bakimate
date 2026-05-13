import type { TFunction } from "i18next";
import type { PurchasesPackage } from "react-native-purchases";

import { MEMBERSHIP_USD_PRICE_TARGETS, membershipPackageTier } from "@/lib/membership-catalog";

/** Short headline for store package type (localized). Fallback: abbreviated package type label. */
export function paywallPlanTitle(pkg: PurchasesPackage, t: TFunction): string {
  const p = String(pkg.packageType).toUpperCase();

  switch (p) {
    case "MONTHLY":
      return t("membership_plan_monthly");
    case "THREE_MONTH":
      return t("membership_plan_3mo");
    case "SIX_MONTH":
      return t("membership_plan_6mo");
    case "ANNUAL":
      return t("membership_plan_year");
    case "WEEKLY":
      return t("membership_plan_weekly");
    case "TWO_MONTH":
      return t("membership_plan_2mo");
    default:
      return String(pkg.packageType).replace(/_/g, " ");
  }
}

/** Optional subtitle: our reference USD tiers (helps when screenshots / reviews mention prices). Store still bills `pkg.product.priceString`. */
export function paywallPlanReferenceBlurb(pkg: PurchasesPackage, t: TFunction): string | null {
  const tier = membershipPackageTier(pkg);
  if (!tier) {
    return null;
  }

  const usd = MEMBERSHIP_USD_PRICE_TARGETS[tier];
  switch (tier) {
    case "monthly":
      return t("membership_ref_usd_monthly", { price: `$${usd}` });
    case "threeMonths":
      return t("membership_ref_usd_3mo", { price: `$${usd}` });
    case "sixMonths":
      return t("membership_ref_usd_6mo", { price: `$${usd}` });
    case "annual":
      return t("membership_ref_usd_year", { price: `$${usd}` });
    default:
      return null;
  }
}
