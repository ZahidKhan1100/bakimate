import axios from "axios";

/** True when the user cancelled an in-flight request (AbortController / axios cancel). */
export function isAbortError(err: unknown): boolean {
  if (axios.isCancel(err)) {
    return true;
  }
  if (axios.isAxiosError(err)) {
    return err.code === "ERR_CANCELED" || err.name === "CanceledError";
  }
  if (err instanceof Error && err.name === "AbortError") {
    return true;
  }
  return false;
}
