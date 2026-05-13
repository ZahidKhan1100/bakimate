/**
 * Format server `subscription_expires_at` (ISO-8601) for display in the user's locale.
 */
export function formatSubscriptionExpiryDateTime(iso: string, localeTag: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return iso;
  }
  return new Intl.DateTimeFormat(localeTag, { dateStyle: "long", timeStyle: "short" }).format(d);
}
