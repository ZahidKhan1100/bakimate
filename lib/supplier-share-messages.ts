import type { ReceiptShopBlurb } from "@/lib/payment-receipt";
import i18n from "@/lib/i18n";
import { formatMoneyMinor } from "@/lib/money";

/** WhatsApp context for a payment recorded to the supplier (payment_out). */
export type SupplierPaymentOutShareContext = {
  supplier: { name: string };
  paidSen: number;
  remainingPayableSen: number;
  shop?: ReceiptShopBlurb | null;
};

/** Prefilled WhatsApp body after paying a supplier (mirrors customer payment receipt wording). */
export function buildSupplierPaymentOutWhatsAppMessage(ctx: SupplierPaymentOutShareContext): string {
  const lines: string[] = [i18n.t("wa_supplier_payment_title")];

  if (ctx.shop?.shopName?.trim()) {
    lines.push(i18n.t("wa_receipt_shop", { name: ctx.shop.shopName.trim() }));
  }
  if (ctx.shop?.shopLocation?.trim()) {
    lines.push(i18n.t("wa_receipt_location", { name: ctx.shop.shopLocation.trim() }));
  }
  if (ctx.shop?.shopContact?.trim()) {
    lines.push(i18n.t("wa_receipt_contact", { name: ctx.shop.shopContact.trim() }));
  }
  if (ctx.shop?.paymentInstructions?.trim()) {
    lines.push(i18n.t("wa_receipt_pay_via", { details: ctx.shop.paymentInstructions.trim() }));
  }

  if (ctx.shop?.hasDuitNowQr) {
    lines.push(i18n.t("wa_receipt_qr_hint"));
  }

  lines.push(
    "",
    i18n.t("wa_supplier_name_line", { name: ctx.supplier.name }),
    i18n.t("wa_supplier_paid_amount", {
      amount: formatMoneyMinor(ctx.paidSen, ctx.shop?.currencyCode),
    }),
    i18n.t("wa_supplier_payable_remaining", {
      amount: formatMoneyMinor(ctx.remainingPayableSen, ctx.shop?.currencyCode),
    }),
    "",
    i18n.t("wa_supplier_payment_footer"),
  );

  return lines.join("\n");
}
