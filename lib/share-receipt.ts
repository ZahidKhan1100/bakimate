import { cacheDirectory, writeAsStringAsync } from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

import type { Customer } from "@/lib/api-types";
import i18n from "@/lib/i18n";
import { formatMoneyMinor, normalizeCurrencyCode } from "@/lib/money";

/**
 * Writes a short receipt text file and opens the system share sheet (WhatsApp, etc.).
 */
export async function shareCustomerReceipt(
  customer: Customer,
  currencyCode: string | null | undefined = undefined,
): Promise<void> {
  const code = normalizeCurrencyCode(currencyCode);
  const body = [
    i18n.t("wa_summary_title"),
    i18n.t("wa_summary_customer", { name: customer.name }),
    customer.phone ? i18n.t("wa_summary_phone", { phone: customer.phone }) : null,
    i18n.t("wa_summary_outstanding", {
      amount: formatMoneyMinor(customer.balance_sen, code),
    }),
    "",
    i18n.t("wa_summary_thanks"),
  ]
    .filter(Boolean)
    .join("\n");

  const base = cacheDirectory ?? "";
  const path = `${base}bakimate-receipt-${customer.id}.txt`;
  await writeAsStringAsync(path, body, {
    encoding: "utf8",
  });

  const can = await Sharing.isAvailableAsync();
  if (!can) {
    throw new Error("Sharing is not available on this device.");
  }

  await Sharing.shareAsync(path, {
    mimeType: "text/plain",
    dialogTitle: i18n.t("wa_summary_share_title"),
  });
}
