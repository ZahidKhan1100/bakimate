/**
 * IANA timezone for API date bucketing (insights, charts).
 * Fallback keeps server behaviour predictable if Intl is unavailable.
 */
export function getDeviceIanaTimezone(): string {
  try {
    const z = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return typeof z === "string" && z.length > 0 ? z : "UTC";
  } catch {
    return "UTC";
  }
}
