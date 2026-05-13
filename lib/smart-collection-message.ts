import i18n from "@/lib/i18n";
import { formatMoneyMinor } from "@/lib/money";
import type { ReceiptShopBlurb } from "@/lib/payment-receipt";

/**
 * Polite “Smart Collections” WhatsApp copy — balance + thank-you tone.
 * Uses the active app language (`i18n.language`).
 */
export function buildSmartCollectionWhatsAppMessage(
  customerName: string,
  balanceSen: number,
  shop?: ReceiptShopBlurb | null,
): string {
  const lines: string[] = [
    i18n.t("wa_smart_hi", { name: customerName }),
    "",
    i18n.t("wa_smart_body"),
    formatMoneyMinor(balanceSen, shop?.currencyCode),
    "",
    i18n.t("wa_smart_followup"),
  ];

  if (shop?.paymentInstructions?.trim()) {
    lines.push("", i18n.t("wa_smart_pay_via"), shop.paymentInstructions.trim());
  }

  if (shop?.hasDuitNowQr) {
    lines.push("", i18n.t("wa_smart_qr_hint"));
  }

  if (shop?.shopName?.trim()) {
    lines.push("", i18n.t("wa_smart_signoff", { name: shop.shopName.trim() }));
  }

  return lines.join("\n");
}
