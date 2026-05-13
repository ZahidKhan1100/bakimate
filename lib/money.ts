/** Default when shop currency missing or invalid (ISO alpha-3). */
export const DEFAULT_SHOP_CURRENCY = "MYR";

export function normalizeCurrencyCode(raw: string | null | undefined): string {
  const t = (raw ?? "").trim().toUpperCase();
  return /^[A-Z]{3}$/.test(t) ? t.slice(0, 3) : DEFAULT_SHOP_CURRENCY;
}

/**
 * Ledger amounts → display string (`Intl`).
 * `sen` = minor units of the shop currency (divide by 100 for major units).
 */
export function formatMoneyMinor(sen: number, currencyCode?: string | null, localeHint?: string): string {
  const code = normalizeCurrencyCode(currencyCode);
  const major = sen / 100;
  try {
    return new Intl.NumberFormat(localeHint ?? undefined, {
      style: "currency",
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(major);
  } catch {
    return `${code}\u00A0${major.toFixed(2)}`;
  }
}

/** @deprecated Use `formatMoneyMinor(sen, currencyCode)` — kept for terse call sites passing currency as 2nd arg. */
export function formatRm(sen: number, currencyCode?: string | null): string {
  return formatMoneyMinor(sen, currencyCode ?? DEFAULT_SHOP_CURRENCY);
}

/** Parses user-entered major amount (e.g. "50", "50.60") → positive minor units or null. */
export function parseRmToSen(raw: string): number | null {
  const n = Number.parseFloat(raw.replace(/,/g, "").trim());
  if (!Number.isFinite(n) || n <= 0) {
    return null;
  }
  return Math.round(n * 100);
}

/**
 * Approximate secondary-currency hint: units of foreign `code` equal to **one major unit**
 * of the shop ledger currency (shown as `(≈ xxx REF)` beside balances).
 *
 * Backend field name stays `reference_currency_per_myr` for compatibility; interpreted as units per shop primary unit.
 */
export function formatReferenceFromPrimary(
  sen: number,
  secondaryCode: string | null | undefined,
  unitsPerShopPrimaryMajor: number | null | undefined,
): string | null {
  if (
    !secondaryCode?.trim() ||
    unitsPerShopPrimaryMajor == null ||
    !Number.isFinite(unitsPerShopPrimaryMajor) ||
    unitsPerShopPrimaryMajor <= 0
  ) {
    return null;
  }

  const primaryMajor = sen / 100;
  const amt = primaryMajor * unitsPerShopPrimaryMajor;
  const c = secondaryCode.trim().toUpperCase();
  const frac = ["PKR", "INR", "IDR", "VND"].includes(c) ? 0 : 2;

  return `≈ ${amt.toLocaleString(undefined, { maximumFractionDigits: frac, minimumFractionDigits: frac })} ${secondaryCode.trim().toUpperCase()}`;
}

/** @deprecated Use `formatReferenceFromPrimary` — same behavior. */
export const formatReferenceFromMyr = formatReferenceFromPrimary;

/** Qist planner: approximate equal weekly installments to clear current balance before target date. */
export function suggestedWeeklyPaySen(balanceSen: number, goalTargetYmd: string | null | undefined): number | null {
  if (!goalTargetYmd || balanceSen <= 0) {
    return null;
  }
  const end = new Date(`${goalTargetYmd}T23:59:59`);
  if (!Number.isFinite(end.getTime())) {
    return null;
  }
  const msLeft = end.getTime() - Date.now();
  const weeksLeft = Math.max(1, Math.ceil(msLeft / (7 * 24 * 60 * 60 * 1000)));

  return Math.max(100, Math.ceil(balanceSen / weeksLeft));
}

/** Paid toward goal = goal total − outstanding (when goal is active). Ratio 0..1 */
export function goalProgressPaidRatio(balanceSen: number, goalAmountSen: number | null | undefined): number | null {
  if (goalAmountSen == null || goalAmountSen <= 0) {
    return null;
  }
  const paid = goalAmountSen - balanceSen;

  return Math.min(1, Math.max(0, paid / goalAmountSen));
}
