/**
 * Parse API date strings (YYYY-MM-DD prefix or full ISO) as a **local calendar** date.
 * Avoids `new Date("YYYY-MM-DD")` UTC midnight shifts.
 */
export function parseCalendarDate(value: string | null | undefined): Date | null {
  if (value == null || String(value).trim() === "") {
    return null;
  }
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value).trim());
  if (!m) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const day = Number(m[3]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(day)) {
    return null;
  }
  const d = new Date(y, mo, day);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Short weekday from a calendar `YYYY-MM-DD` — uses local calendar parsing (no UTC shift). */
export function formatChartWeekdayLabel(value: string | null | undefined, i18nLanguage: string): string {
  const d = parseCalendarDate(value);
  if (!d) {
    return "—";
  }
  const loc = i18nLanguage.startsWith("ms") ? "ms-MY" : "en-MY";
  try {
    return new Intl.DateTimeFormat(loc, { weekday: "short" }).format(d);
  } catch {
    return d.toLocaleDateString(loc, { weekday: "short" });
  }
}

/** `en` → en-MY, `ms` → ms-MY (Malaysia-style day/month). */
export function formatCalendarDateShort(value: string | null | undefined, i18nLanguage: string): string {
  const d = parseCalendarDate(value);
  if (!d) {
    return value != null && String(value).trim() !== "" ? String(value).trim() : "—";
  }
  const loc = i18nLanguage.startsWith("ms") ? "ms-MY" : "en-MY";
  try {
    return new Intl.DateTimeFormat(loc, {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(d);
  } catch {
    return d.toLocaleDateString(loc);
  }
}
