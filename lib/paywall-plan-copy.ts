import type { TFunction } from "i18next";
import type { PurchasesPackage } from "react-native-purchases";

import { MEMBERSHIP_USD_PRICE_TARGETS, resolvedMembershipPackageTier } from "@/lib/membership-catalog";

/** Short headline: App Store product title when present, else localized label from tier / package type. */
export function paywallPlanTitle(pkg: PurchasesPackage, t: TFunction): string {
  const storeTitle =
    typeof pkg.product.title === "string" ? pkg.product.title.trim() : "";
  if (storeTitle !== "") {
    return storeTitle;
  }

  const tier = resolvedMembershipPackageTier(pkg);
  if (tier) {
    switch (tier) {
      case "monthly":
        return t("membership_plan_monthly");
      case "threeMonths":
        return t("membership_plan_3mo");
      case "sixMonths":
        return t("membership_plan_6mo");
      case "annual":
        return t("membership_plan_year");
      default:
        break;
    }
  }

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

/** Optional subtitle: reference USD tiers only when the store has not returned `priceString` yet. */
export function paywallPlanReferenceBlurb(pkg: PurchasesPackage, t: TFunction): string | null {
  const storePrice =
    typeof pkg.product.priceString === "string" ? pkg.product.priceString.trim() : "";
  if (storePrice !== "") {
    return null;
  }

  const tier = resolvedMembershipPackageTier(pkg);
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
