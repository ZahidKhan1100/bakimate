/**
 * Produce digits-only `wa.me/<number>` path (no +). Targets MY/SG-heavy defaults for common shopkeeper formatting.
 *
 * Rules (in order): explicit intl prefixes kept; Malaysian domestic `01…`/`0…` → `60`; 8‑digit SG mobile (`8`,`9`,`6`), else pass-through digits.
 */
export function normalizePhoneForWaMe(raw: string | null | undefined): string | null {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (digits.length === 0) {
    return null;
  }

  if (digits.startsWith("60")) {
    return digits;
  }
  if (digits.startsWith("65")) {
    return digits;
  }
  if (digits.startsWith("62")) {
    return digits;
  }

  /** US/Canada / UK-ish without + */
  if (digits.startsWith("1") && digits.length >= 11) {
    return digits;
  }
  if (digits.startsWith("44") && digits.length >= 10) {
    return digits;
  }

  /** Malaysian domestic (01x-xxxxxxx, etc.) */
  if (digits.startsWith("0") && digits.length >= 9 && digits.length <= 12) {
    return `60${digits.slice(1)}`;
  }

  /** Singapore 8-digit mobiles */
  if (digits.length === 8 && /^[689]/.test(digits)) {
    return `65${digits}`;
  }

  /** Already looks like trunk without leading zero (risky fallback) — still useful for pasted intl digits */
  if (digits.length >= 10 && digits.length <= 15) {
    return digits;
  }

  return digits;
}
