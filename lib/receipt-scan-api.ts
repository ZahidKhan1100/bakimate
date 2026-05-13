import { apiBaseUrl } from "@/lib/api";
import { useSessionStore } from "@/stores/session-store";

export type ReceiptScanApiResponse = {
  suggested_amount_sen: number | null;
  suggested_date_ymd: string | null;
  raw_preview?: string | null;
  error_code?: string | null;
};

async function parseJsonSafely(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * Sends a local JPEG/PNG URI to Laravel `POST /receipt-scan` (multipart).
 * Uses `fetch` so axios default JSON Content-Type doesn't fight FormData boundaries.
 */
export async function scanReceiptFromImageUri(localUri: string): Promise<ReceiptScanApiResponse> {
  const token = useSessionStore.getState().token;
  const name = localUri.split("/").pop() ?? "receipt.jpg";
  const mime = /\.png($|\?)/i.test(localUri) ? "image/png" : "image/jpeg";

  const form = new FormData();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form.append("image", { uri: localUri, type: mime, name } as any);

  const res = await fetch(`${apiBaseUrl}/receipt-scan`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: form,
  });

  const body = await parseJsonSafely(res);

  if (!res.ok) {
    let msg =
      typeof body === "object" &&
      body !== null &&
      "message" in body &&
      typeof (body as { message?: unknown }).message === "string"
        ? ((body as { message: string }).message ?? "").trim()
        : "";
    if (!msg && res.status >= 400) {
      msg = `${res.status} ${res.statusText}`.trim();
    }
    throw new Error(msg || "Receipt scan failed");
  }

  if (!body || typeof body !== "object") {
    return { suggested_amount_sen: null, suggested_date_ymd: null, error_code: "invalid_payload" };
  }

  const b = body as Record<string, unknown>;
  const sen = typeof b.suggested_amount_sen === "number" ? b.suggested_amount_sen : null;
  const ymd = typeof b.suggested_date_ymd === "string" ? b.suggested_date_ymd : null;
  const preview = typeof b.raw_preview === "string" ? b.raw_preview : null;
  const err = typeof b.error_code === "string" ? b.error_code : null;

  return {
    suggested_amount_sen: sen,
    suggested_date_ymd: ymd ?? null,
    raw_preview: preview,
    error_code: err,
  };
}
