import type { Contact, ExistingContact } from "expo-contacts";
import * as Contacts from "expo-contacts";
import { Platform } from "react-native";

export type ContactSuggestion = {
  id: string;
  name: string;
  phone: string;
};

export function formatContactName(c: Contacts.Contact): string {
  if (c.name?.trim()) return c.name.trim();
  const companyRaw = (c as { company?: unknown }).company;
  if (typeof companyRaw === "string" && companyRaw.trim() !== "") return companyRaw.trim();
  const parts = [c.firstName, c.middleName, c.lastName].filter((x) => typeof x === "string" && x.trim() !== "");
  if (parts.length > 0) return parts.join(" ").trim();
  return "";
}

/**
 * Map a contact returned from the system picker into name + primary phone.
 */
export function contactToSuggestion(c: Contact): ContactSuggestion | null {
  const name = formatContactName(c);
  if (!name) return null;
  let bestPhone = "";
  const numbers = c.phoneNumbers;
  const list = Array.isArray(numbers) ? numbers : [];
  for (const p of list) {
    const num = (p.number ?? "").trim();
    if (num) {
      bestPhone = num;
      break;
    }
  }
  const rawId = "id" in c ? (c as ExistingContact).id : undefined;
  const id =
    typeof rawId === "string" && rawId.length > 0
      ? rawId
      : Array.isArray(rawId) && typeof rawId[0] === "string" && rawId[0].length > 0
        ? rawId[0]
        : `picked-${name}\u0000${bestPhone}`;
  return { id, name, phone: bestPhone };
}

/**
 * Opens the OS contact picker (single selection).
 *
 * - **Android:** `expo-contacts` resolves the picker result via the contacts
 *   ContentProvider (`getContactById`), which requires **`READ_CONTACTS`** at
 *   runtime — otherwise returning from the picker can crash with
 *   `SecurityException`. We request it before presenting the picker.
 * - **iOS:** Prefer not pre-requesting full Contacts access so permission UI
 *   does not awkwardly stack on top of React Native Modals (`BottomSheet`).
 */
export type PickContactFromPickerResult = {
  suggestion: ContactSuggestion | null;
  /** Android: user declined `READ_CONTACTS` (required before the picker result can be read). */
  permissionDenied?: boolean;
};

export async function pickContactWithSystemPicker(): Promise<PickContactFromPickerResult> {
  try {
    if (Platform.OS === "android") {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== "granted") {
        return { suggestion: null, permissionDenied: true };
      }
    }
    const c = await Contacts.presentContactPickerAsync();
    if (!c) return { suggestion: null };
    return { suggestion: contactToSuggestion(c) };
  } catch {
    return { suggestion: null };
  }
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

    for (const p of Array.isArray(c.phoneNumbers) ? c.phoneNumbers : []) {
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
