/** Curated ISO 4217 codes for shop ledger selection (sorted A–Z). */
const RAW = [
  "AED",
  "AUD",
  "BDT",
  "BHD",
  "BND",
  "CAD",
  "CHF",
  "CNY",
  "EGP",
  "EUR",
  "GBP",
  "HKD",
  "IDR",
  "INR",
  "IQD",
  "JOD",
  "JPY",
  "KHR",
  "KRW",
  "KWD",
  "LAK",
  "LBP",
  "LKR",
  "MAD",
  "MMK",
  "MVR",
  "MYR",
  "NPR",
  "NZD",
  "OMR",
  "PHP",
  "PKR",
  "QAR",
  "SAR",
  "SGD",
  "THB",
  "TRY",
  "TWD",
  "USD",
  "VND",
  "ZAR",
] as const;

export const SHOP_LEDGER_CURRENCY_CODES: readonly string[] = [...RAW].sort((a, b) => a.localeCompare(b));

/** Localised currency name for a valid ISO alpha-3 code (e.g. MYR → "Malaysian ringgit"). */
export function currencyNameOnly(code: string, localeHint: string): string {
  const c = code.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(c)) {
    return "";
  }
  const loc = localeHint.startsWith("ms") ? "ms-MY" : "en-MY";
  try {
    return new Intl.DisplayNames([loc], { type: "currency" }).of(c) ?? c;
  } catch {
    return c;
  }
}
