import { Platform } from "react-native";
import { ExpoSpeechRecognitionModule } from "expo-speech-recognition";

/** User preference for on-device speech recognition (BCP-47). */
export type VoiceSttLocalePreference = "auto" | "en-US" | "ms-MY" | "ur-PK";

export const VOICE_STT_LOCALE_OPTIONS: readonly {
  key: VoiceSttLocalePreference;
  labelKey: string;
}[] = [
  { key: "auto", labelKey: "voice_stt_auto" },
  { key: "en-US", labelKey: "voice_stt_en" },
  { key: "ms-MY", labelKey: "voice_stt_ms" },
  { key: "ur-PK", labelKey: "voice_stt_ur" },
] as const;

/** Legacy persisted value — Pashto removed from voice settings. */
export function sanitizeVoiceSttLocale(raw: string | undefined): VoiceSttLocalePreference {
  if (raw === "ps-AF" || raw === "ps") {
    return "auto";
  }
  if (VOICE_STT_LOCALE_OPTIONS.some((o) => o.key === raw)) {
    return raw as VoiceSttLocalePreference;
  }
  return "auto";
}

/** Resolve BCP-47 tag for expo-speech-recognition from prefs + app UI language. */
export function resolveVoiceSttBcp47(
  preference: VoiceSttLocalePreference,
  appLanguage: string,
): string {
  const pref = sanitizeVoiceSttLocale(preference);
  if (pref !== "auto") {
    return pref;
  }
  if (appLanguage.startsWith("ms")) {
    return "ms-MY";
  }
  return "en-US";
}

/** Pick a locale the device speech engine actually supports (iOS often lacks ur-PK). */
export async function resolveSpeechLocaleForDevice(
  preference: VoiceSttLocalePreference,
  appLanguage: string,
): Promise<string> {
  const desired = resolveVoiceSttBcp47(preference, appLanguage);
  try {
    const { locales, installedLocales } = await ExpoSpeechRecognitionModule.getSupportedLocales({});
    const supported = new Set([...locales, ...installedLocales]);
    if (supported.has(desired)) {
      return desired;
    }
    if (desired.startsWith("ur") && supported.has("en-US")) {
      return "en-US";
    }
    if (desired.startsWith("ms") && supported.has("en-US")) {
      return "en-US";
    }
    if (supported.has("en-US")) {
      return "en-US";
    }
    const first = locales[0] ?? installedLocales[0];
    return first ?? desired;
  } catch {
    return Platform.OS === "ios" && desired === "ur-PK" ? "en-US" : desired;
  }
}

/** Bias strings for STT (udhaar, payments, quick items). */
export function buildVoiceContextualStrings(params: {
  customerName: string;
  quickItems: string[];
  currencyCode: string;
  intentHint?: "credit" | "payment";
}): string[] {
  const out = new Set<string>();
  const add = (s: string) => {
    const t = s.trim();
    if (t) out.add(t);
  };

  add(params.customerName);
  add(params.currencyCode);
  add("udhaar");
  add("credit");
  add("payment");
  add("paid");
  add("got paid");
  add("received");
  add("hutang");
  add("bayar");
  add("bayaran");
  add("terima");
  add("wusool");
  add("wasool");
  add("liya");
  add("mila");
  add("cash");
  add("collect");
  add("de");
  add("li");
  add("sau");
  add("hundred");
  add("lima ratus");
  add("tiga ratus");
  add("RM");
  add("PKR");
  add("beras");
  add("rice");
  add("chawal");
  add("phone");
  add("fridge");
  add("grocery");

  if (params.intentHint !== "payment") {
    for (const item of params.quickItems) {
      add(item);
    }
  }

  return [...out].slice(0, 48);
}
