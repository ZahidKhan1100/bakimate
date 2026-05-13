import i18n from "@/lib/i18n";
import { formatMoneyMinor } from "@/lib/money";
import type { ReceiptShopBlurb } from "@/lib/payment-receipt";

/**
 * WhatsApp copy for automated “weekly nudge” prompts — paired with Insights / local reminders.
 * Uses the active app language (`i18n.language`).
 */
export function buildWeeklyNudgeWhatsAppMessage(
  customerName: string,
  balanceSen: number,
  shop?: ReceiptShopBlurb | null,
): string {
  const lines: string[] = [
    i18n.t("wa_nudge_hi", { name: customerName }),
    "",
    i18n.t("wa_nudge_body"),
    i18n.t("wa_nudge_outstanding", {
      amount: formatMoneyMinor(balanceSen, shop?.currencyCode),
    }),
  ];

  if (shop?.paymentInstructions?.trim()) {
    lines.push("", i18n.t("wa_nudge_how_to_pay"), shop.paymentInstructions.trim());
  }

  if (shop?.hasDuitNowQr) {
    lines.push("", i18n.t("wa_nudge_qr_hint"));
  }

  if (shop?.shopName?.trim()) {
    lines.push("", i18n.t("wa_nudge_shop", { name: shop.shopName.trim() }));
  }

  lines.push("", i18n.t("wa_nudge_closing"));

  return lines.join("\n");
}
