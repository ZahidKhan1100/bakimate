import type { TFunction } from "i18next";
import type { PurchasesPackage } from "react-native-purchases";

/** True when StoreKit / Play reports a zero-price introductory phase on the product. */
export function storeProductHasFreeIntro(pkg: PurchasesPackage): boolean {
  const intro = pkg.product.introPrice;
  if (intro == null) {
    return false;
  }
  return intro.price === 0;
}

export function paywallPrimaryCtaLabel(pkg: PurchasesPackage, t: TFunction): string {
  return storeProductHasFreeIntro(pkg) ? t("paywall_start_free_trial") : t("paywall_subscribe");
}
