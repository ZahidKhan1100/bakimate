import { api, apiBaseUrl } from "@/lib/api";

import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

export type CustomerPdfKind = "ledger" | "settlement";

/** A4 credit invoice for a single posted credit transaction. */
export async function shareCreditInvoicePdf(customerId: number, transactionId: number): Promise<void> {
  if (customerId <= 0 || transactionId <= 0) {
    throw new Error("Invalid customer or transaction");
  }

  const path = `/customers/${customerId}/documents/credit-invoice/${transactionId}`;
  const url = `${apiBaseUrl.replace(/\/+$/, "")}${path}`;

  const authHdr = api.defaults.headers.common.Authorization;
  if (!authHdr || typeof authHdr !== "string") {
    throw new Error("Not authenticated");
  }

  const dir = FileSystem.cacheDirectory ?? null;
  if (!dir) {
    throw new Error("File cache is not available");
  }

  const fileUri = `${dir}bakimate-credit-${customerId}-${transactionId}.pdf`;

  const res = await FileSystem.downloadAsync(url, fileUri, {
    headers: {
      Authorization: authHdr,
      Accept: "application/pdf",
    },
  });

  if (res.status !== 200) {
    await FileSystem.deleteAsync(res.uri, { idempotent: true }).catch(() => undefined);
    throw Object.assign(new Error(`PDF HTTP ${res.status}`), { statusCode: res.status });
  }

  const sharable = await Sharing.isAvailableAsync();
  if (!sharable) {
    throw new Error("Sharing is not available");
  }

  await Sharing.shareAsync(res.uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf" });
}

/** A4 payment receipt for a single posted payment transaction. */
export async function sharePaymentReceiptPdf(customerId: number, transactionId: number): Promise<void> {
  if (customerId <= 0 || transactionId <= 0) {
    throw new Error("Invalid customer or transaction");
  }

  const path = `/customers/${customerId}/documents/payment-receipt/${transactionId}`;
  const url = `${apiBaseUrl.replace(/\/+$/, "")}${path}`;

  const authHdr = api.defaults.headers.common.Authorization;
  if (!authHdr || typeof authHdr !== "string") {
    throw new Error("Not authenticated");
  }

  const dir = FileSystem.cacheDirectory ?? null;
  if (!dir) {
    throw new Error("File cache is not available");
  }

  const fileUri = `${dir}bakimate-payment-${customerId}-${transactionId}.pdf`;

  const res = await FileSystem.downloadAsync(url, fileUri, {
    headers: {
      Authorization: authHdr,
      Accept: "application/pdf",
    },
  });

  if (res.status !== 200) {
    await FileSystem.deleteAsync(res.uri, { idempotent: true }).catch(() => undefined);
    throw Object.assign(new Error(`PDF HTTP ${res.status}`), { statusCode: res.status });
  }

  const sharable = await Sharing.isAvailableAsync();
  if (!sharable) {
    throw new Error("Sharing is not available");
  }

  await Sharing.shareAsync(res.uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf" });
}

/** Download PDF via same auth headers as Axios, cache locally, open share sheet. */
export async function shareCustomerPdf(customerId: number, kind: CustomerPdfKind): Promise<void> {
  if (customerId <= 0) {
    throw new Error("Invalid customer");
  }

  const slug = kind === "ledger" ? "ledger" : "settlement";
  const path = `/customers/${customerId}/documents/${slug}`;
  const url = `${apiBaseUrl.replace(/\/+$/, "")}${path}`;

  const authHdr = api.defaults.headers.common.Authorization;
  if (!authHdr || typeof authHdr !== "string") {
    throw new Error("Not authenticated");
  }

  const dir = FileSystem.cacheDirectory ?? null;
  if (!dir) {
    throw new Error("File cache is not available");
  }

  const fileUri = `${dir}bakimate-${slug}-${customerId}.pdf`;

  const res = await FileSystem.downloadAsync(url, fileUri, {
    headers: {
      Authorization: authHdr,
      Accept: "application/pdf",
    },
  });

  if (res.status !== 200) {
    await FileSystem.deleteAsync(res.uri, { idempotent: true }).catch(() => undefined);
    throw Object.assign(new Error(`PDF HTTP ${res.status}`), { statusCode: res.status });
  }

  const sharable = await Sharing.isAvailableAsync();
  if (!sharable) {
    throw new Error("Sharing is not available");
  }

  await Sharing.shareAsync(res.uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf" });
}

/** Current calendar month PDF (premium) — `month` format `YYYY-MM`. */
export async function shareMonthlyStatementPdf(monthYyyyMm: string): Promise<void> {
  if (!/^\d{4}-\d{2}$/.test(monthYyyyMm)) {
    throw new Error("Month must be YYYY-MM");
  }

  const path = `/reports/monthly-statement?month=${encodeURIComponent(monthYyyyMm)}`;
  const url = `${apiBaseUrl.replace(/\/+$/, "")}${path}`;

  const authHdr = api.defaults.headers.common.Authorization;
  if (!authHdr || typeof authHdr !== "string") {
    throw new Error("Not authenticated");
  }

  const dir = FileSystem.cacheDirectory ?? null;
  if (!dir) {
    throw new Error("File cache is not available");
  }

  const fileUri = `${dir}bakimate-statement-${monthYyyyMm}.pdf`;

  const res = await FileSystem.downloadAsync(url, fileUri, {
    headers: {
      Authorization: authHdr,
      Accept: "application/pdf",
    },
  });

  if (res.status !== 200) {
    await FileSystem.deleteAsync(res.uri, { idempotent: true }).catch(() => undefined);
    throw Object.assign(new Error(`PDF HTTP ${res.status}`), { statusCode: res.status });
  }

  const sharable = await Sharing.isAvailableAsync();
  if (!sharable) {
    throw new Error("Sharing is not available");
  }

  await Sharing.shareAsync(res.uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf" });
}
