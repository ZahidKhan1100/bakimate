import { intlLocaleFor } from "@/lib/format-dates";

/** Local calendar date as YYYY-MM-DD. */
export function todayYmd(): string {
  return addDaysLocal(0);
}

export function addDaysLocal(days: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}

/** Last N calendar months including current, as YYYY-MM (newest first). */
export function recentMonthKeys(count = 12): string[] {
  const out: string[] = [];
  const d = new Date();
  d.setDate(1);
  for (let i = 0; i < count; i++) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    out.push(`${y}-${m}`);
    d.setMonth(d.getMonth() - 1);
  }
  return out;
}

export function formatMonthLabel(yyyyMm: string, language: string): string {
  const [y, mo] = yyyyMm.split("-").map(Number);
  if (!y || !mo) {
    return yyyyMm;
  }
  const loc = intlLocaleFor(language);
  try {
    return new Intl.DateTimeFormat(loc, { month: "short", year: "numeric" }).format(
      new Date(y, mo - 1, 1),
    );
  } catch {
    return yyyyMm;
  }
}
