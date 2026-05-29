import type { Customer } from "@/lib/api-types";
import i18n from "@/lib/i18n";
import { formatMoneyMinor } from "@/lib/money";

/** Optional lines appended to WhatsApp receipt / reminders from Profile → Shop. */
export type ReceiptShopBlurb = {
  shopName?: string;
  shopLocation?: string;
  shopContact?: string;
  paymentInstructions?: string;
  /** True when a DuitNow / QR image exists in Profile (hint in WhatsApp). */
  hasDuitNowQr?: boolean;
  /** ISO alpha-3 for formatting amounts in message copy. */
  currencyCode?: string;
};

export type PaymentReceiptContext = {
  customer: Pick<Customer, "name">;
  paidSen: number;
  remainingBalanceSen: number;
  shop?: ReceiptShopBlurb | null;
};

export function buildPaymentReceiptWhatsAppMessage(ctx: PaymentReceiptContext): string {
  const lines: string[] = [i18n.t("wa_receipt_title")];

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
    i18n.t("wa_receipt_customer", { name: ctx.customer.name }),
    i18n.t("wa_receipt_paid_today", {
      amount: formatMoneyMinor(ctx.paidSen, ctx.shop?.currencyCode),
    }),
    i18n.t("wa_receipt_remaining", {
      amount: formatMoneyMinor(ctx.remainingBalanceSen, ctx.shop?.currencyCode),
    }),
    "",
    i18n.t("wa_receipt_thanks"),
  );

  return lines.join("\n");
}

export type CreditRecordedWhatsAppContext = {
  customer: Pick<Customer, "name">;
  creditSen: number;
  newBalanceSen: number;
  shop?: ReceiptShopBlurb | null;
};

/** Prefilled message after recording new credit (balance / shop blurb mirror payment receipt). */
export function buildCreditRecordedWhatsAppMessage(ctx: CreditRecordedWhatsAppContext): string {
  const lines: string[] = [i18n.t("wa_credit_title")];

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
    i18n.t("wa_receipt_customer", { name: ctx.customer.name }),
    i18n.t("wa_credit_given_today", {
      amount: formatMoneyMinor(ctx.creditSen, ctx.shop?.currencyCode),
    }),
    i18n.t("wa_credit_balance_owing", {
      amount: formatMoneyMinor(ctx.newBalanceSen, ctx.shop?.currencyCode),
    }),
    "",
    i18n.t("wa_credit_thanks"),
  );

  return lines.join("\n");
}

export function buildInstallmentReminderMessage(
  customerName: string,
  balanceSen: number,
  shop?: ReceiptShopBlurb | null,
): string {
  const lines: string[] = [i18n.t("wa_install_intro"), ""];

  if (shop?.shopName?.trim()) {
    lines.push(i18n.t("wa_receipt_shop", { name: shop.shopName.trim() }));
  }
  if (shop?.shopLocation?.trim()) {
    lines.push(i18n.t("wa_receipt_location", { name: shop.shopLocation.trim() }));
  }
  if (shop?.shopContact?.trim()) {
    lines.push(i18n.t("wa_install_contact_whatsapp", { contact: shop.shopContact.trim() }));
  }
  if (shop?.paymentInstructions?.trim()) {
    lines.push("", i18n.t("wa_install_how_to_pay"), shop.paymentInstructions.trim(), "");
  }
  if (
    shop?.shopName?.trim() ||
    shop?.shopLocation?.trim() ||
    shop?.shopContact?.trim() ||
    shop?.paymentInstructions?.trim()
  ) {
    lines.push("");
  }

  lines.push(
    i18n.t("wa_install_name_book", { name: customerName }),
    i18n.t("wa_install_outstanding", {
      amount: formatMoneyMinor(balanceSen, shop?.currencyCode),
    }),
    "",
    i18n.t("wa_install_closing"),
  );

  return lines.join("\n");
}
