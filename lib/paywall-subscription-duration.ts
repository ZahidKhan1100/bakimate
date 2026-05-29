import type { TFunction } from "i18next";
import type { PurchasesPackage } from "react-native-purchases";

import { resolvedMembershipPackageTier } from "@/lib/membership-catalog";

/** Human-readable subscription period for App Store 3.1.2(c) disclosure. */
export function paywallSubscriptionDurationLabel(pkg: PurchasesPackage, t: TFunction): string {
  const tier = resolvedMembershipPackageTier(pkg);
  if (tier) {
    switch (tier) {
      case "monthly":
        return t("subscription_duration_1_month");
      case "threeMonths":
        return t("subscription_duration_3_months");
      case "sixMonths":
        return t("subscription_duration_6_months");
      case "annual":
        return t("subscription_duration_1_year");
      default:
        break;
    }
  }

  const p = String(pkg.packageType).toUpperCase();
  switch (p) {
    case "MONTHLY":
      return t("subscription_duration_1_month");
    case "THREE_MONTH":
      return t("subscription_duration_3_months");
    case "SIX_MONTH":
      return t("subscription_duration_6_months");
    case "ANNUAL":
      return t("subscription_duration_1_year");
    case "WEEKLY":
      return t("subscription_duration_1_week");
    case "TWO_MONTH":
      return t("subscription_duration_2_months");
    default:
      return t("subscription_duration_auto_renewing");
  }
}
