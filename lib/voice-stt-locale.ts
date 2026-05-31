/** User preference for on-device speech recognition (BCP-47). */
export type VoiceSttLocalePreference = "auto" | "en-US" | "ms-MY" | "ur-PK" | "ps-AF";

export const VOICE_STT_LOCALE_OPTIONS: readonly {
  key: VoiceSttLocalePreference;
  labelKey: string;
}[] = [
  { key: "auto", labelKey: "voice_stt_auto" },
  { key: "en-US", labelKey: "voice_stt_en" },
  { key: "ms-MY", labelKey: "voice_stt_ms" },
  { key: "ur-PK", labelKey: "voice_stt_ur" },
  { key: "ps-AF", labelKey: "voice_stt_ps" },
] as const;

/** Resolve BCP-47 tag for expo-speech-recognition from prefs + app UI language. */
export function resolveVoiceSttBcp47(
  preference: VoiceSttLocalePreference,
  appLanguage: string,
): string {
  if (preference !== "auto") {
    return preference;
  }
  if (appLanguage.startsWith("ms")) {
    return "ms-MY";
  }
  return "en-US";
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
