import * as Contacts from "expo-contacts";

export type ContactSuggestion = {
  id: string;
  name: string;
  phone: string;
};

function formatContactName(c: Contacts.Contact): string {
  if (c.name?.trim()) return c.name.trim();
  const parts = [c.firstName, c.middleName, c.lastName].filter((x) => typeof x === "string" && x.trim() !== "");
  if (parts.length > 0) return parts.join(" ").trim();
  return "";
}

function normalizeDigits(s: string): string {
  return s.replace(/\D/g, "");
}

/**
 * Request contacts permission and load all contacts (name + phone numbers).
 * Returns null if permission denied or load failed.
 */
export async function loadContactsDirectory(): Promise<Contacts.Contact[] | null> {
  const { status } = await Contacts.requestPermissionsAsync();
  if (status !== "granted") {
    return null;
  }
  const { data } = await Contacts.getContactsAsync({
    fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
  });
  return data ?? [];
}

/**
 * Filter contacts by display name or phone digits (min 2 characters in query).
 */
export function matchContactSuggestions(
  contacts: Contacts.Contact[],
  query: string,
  limit = 12,
): ContactSuggestion[] {
  const raw = query.trim();
  if (raw.length < 2) {
    return [];
  }
  const qLower = raw.toLowerCase();
  const qDigits = normalizeDigits(raw);
  const out: ContactSuggestion[] = [];
  const seen = new Set<string>();

  for (const c of contacts) {
    const name = formatContactName(c);
    if (!name) continue;

    const nameHit = name.toLowerCase().includes(qLower);
    let phoneHit = false;
    let bestPhone = "";

    for (const p of c.phoneNumbers ?? []) {
      const num = (p.number ?? "").trim();
      if (!num) continue;
      if (!bestPhone) bestPhone = num;
      const d = normalizeDigits(num);
      if (qDigits.length >= 2 && d.includes(qDigits)) {
        phoneHit = true;
      }
    }

    if (!nameHit && !phoneHit) continue;
    if (!bestPhone) continue;

    const key = `${name}\u0000${bestPhone}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ id: key, name, phone: bestPhone });
    if (out.length >= limit) break;
  }

  return out;
}
