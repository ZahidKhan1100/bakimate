import axios from "axios";

import i18n from "@/lib/i18n";

/** Avoid showing SQL / stack traces surfaced as API `message` (e.g. debug backend or proxy errors). */
function messageLooksTechnical(msg: string): boolean {
  const m = msg.toLowerCase();

  return (
    m.includes("sqlstate") ||
    m.includes("pdoexception") ||
    m.includes("integrity constraint violation") ||
    m.includes("duplicate entry") ||
    m.includes("mysql") ||
    m.includes("postgresql") ||
    m.includes("ORA-") ||
    m.includes('relation "')
  );
}

function firstNestedMessage(data: unknown): string | null {
  if (!data || typeof data !== "object") {
    return null;
  }
  const errs = (data as { errors?: Record<string, unknown> }).errors;
  if (errs && typeof errs === "object") {
    const firstArr = Object.values(errs)[0];
    if (Array.isArray(firstArr) && typeof firstArr[0] === "string") {
      return firstArr[0];
    }
  }

  const m = (data as { message?: unknown }).message;
  return typeof m === "string" && m.trim() !== "" ? m : null;
}

/**
 * Human-readable text for failed REST calls (`message` / validation errors from Laravel, Axios, or Errors).
 */
export function apiErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const code = typeof err.code === "string" ? err.code.toUpperCase() : "";
    const noReply = err.response === undefined || err.response === null;
    if (
      code === "ERR_NETWORK" ||
      code === "ECONNABORTED" ||
      (noReply && typeof err.message === "string" && err.message.toLowerCase().includes("timeout"))
    ) {
      return i18n.t("api_error_network_or_timeout");
    }

    const fromBody = err.response?.data !== undefined ? firstNestedMessage(err.response.data) : null;
    const rawMsg = typeof fromBody === "string" ? fromBody : null;
    if (rawMsg != null && messageLooksTechnical(rawMsg)) {
      return i18n.t("api_error_generic_server");
    }
    if (rawMsg != null) {
      return rawMsg;
    }
    if (typeof err.message === "string" && err.message.trim() !== "") {
      if (noReply || messageLooksTechnical(err.message)) {
        return i18n.t("api_error_generic_server");
      }

      return err.message;
    }
  }

  if (err instanceof Error && err.message.trim() !== "") {
    if (messageLooksTechnical(err.message)) {
      return i18n.t("api_error_generic_server");
    }

    return err.message;
  }

  return String(err);
}
