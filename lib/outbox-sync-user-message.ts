import i18n from "@/lib/i18n";
import { apiErrorMessage } from "@/lib/api-error-message";
import type { OutboxSyncSummary } from "@/lib/transaction-outbox";

function parseStoredFlushError(raw: string | null): string | null {
  if (!raw?.trim()) {
    return null;
  }

  try {
    const data = JSON.parse(raw) as { message?: unknown };
    if (typeof data.message === "string" && data.message.trim() !== "") {
      return data.message.trim();
    }
  } catch {
    /** plain text from older builds */
  }

  return raw.trim();
}

/** User-facing explanation after a flush attempt left rows in the outbox. */
export function outboxSyncFailureMessage(summary: OutboxSyncSummary): string {
  if (summary.subscriptionBlocked) {
    return i18n.t("pending_sync_subscription");
  }

  const parsed = parseStoredFlushError(summary.firstError);
  if (parsed) {
    if (/subscription/i.test(parsed)) {
      return i18n.t("pending_sync_subscription");
    }
    if (/waiting for customer/i.test(parsed)) {
      return i18n.t("pending_sync_waiting_customer");
    }
    return parsed;
  }

  return i18n.t("pending_sync_failed");
}

export function outboxSyncThrownMessage(err: unknown): string {
  return apiErrorMessage(err);
}
