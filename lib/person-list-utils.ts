/** Filter people lists (customers, suppliers) by name or phone digits. */
export function filterByNameAndPhone<T extends { name: string; phone: string | null }>(
  items: T[],
  query: string,
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return items;
  }
  const digits = q.replace(/\D/g, "");
  return items.filter((row) => {
    if (row.name.toLowerCase().includes(q)) {
      return true;
    }
    const phone = (row.phone ?? "").replace(/\D/g, "");
    return digits.length >= 2 && phone.includes(digits);
  });
}

export type PersonSection<T> = {
  title: string;
  data: T[];
};

function sectionKeyForName(name: string): string {
  const first = name.trim().charAt(0).toUpperCase();
  if (!first) {
    return "#";
  }
  if (first >= "A" && first <= "Z") {
    return first;
  }
  return "#";
}

/** Sort A–Z and group for contacts-style section lists. */
export function groupByNameLetter<T extends { name: string }>(items: T[]): PersonSection<T>[] {
  const sorted = [...items].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );
  const buckets = new Map<string, T[]>();
  for (const row of sorted) {
    const key = sectionKeyForName(row.name);
    const list = buckets.get(key) ?? [];
    list.push(row);
    buckets.set(key, list);
  }
  const titles = [...buckets.keys()].sort((a, b) => {
    if (a === "#") {
      return 1;
    }
    if (b === "#") {
      return -1;
    }
    return a.localeCompare(b);
  });
  return titles.map((title) => ({ title, data: buckets.get(title) ?? [] }));
}
