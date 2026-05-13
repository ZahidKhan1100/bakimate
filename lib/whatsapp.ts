import * as Linking from "expo-linking";

import { normalizePhoneForWaMe } from "@/lib/phone-wa-me";

/**
 * Opens WhatsApp with prefilled body. Phone is normalized for common MY/SG formatting (see `normalizePhoneForWaMe`).
 */
export async function openWhatsAppText(
  message: string,
  phoneE164OrLocal?: string | null,
): Promise<void> {
  const q = encodeURIComponent(message);

  const num = normalizePhoneForWaMe(phoneE164OrLocal);

  const url =
    num !== null ? `https://wa.me/${num}?text=${q}` : `https://wa.me/?text=${q}`;

  const can = await Linking.canOpenURL(url);

  if (!can) {
    throw new Error("WhatsApp is not available on this device.");
  }

  await Linking.openURL(url);
}
