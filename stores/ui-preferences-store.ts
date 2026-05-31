import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { VoiceSttLocalePreference } from "@/lib/voice-stt-locale";

/** How the app picks light vs dark. `system` follows the device. */
export type ColorSchemePreference = "system" | "light" | "dark";

/** Cross-session UI toggles — not synced to server. */
type UiPrefs = {
  /** Home / dashboard: secondary reference amounts (PKR etc.) beside ledger currency when shop rate is configured. */
  dashboardShowSecondaryReference: boolean;
  setDashboardShowSecondaryReference: (v: boolean) => void;
  /** Resolved with device appearance when `system`. */
  colorSchemePreference: ColorSchemePreference;
  setColorSchemePreference: (v: ColorSchemePreference) => void;
  /** On-device speech recognition language for voice ledger. */
  voiceSttLocale: VoiceSttLocalePreference;
  setVoiceSttLocale: (v: VoiceSttLocalePreference) => void;
};

export const useUiPreferencesStore = create<UiPrefs>()(
  persist(
    (set) => ({
      dashboardShowSecondaryReference: true,
      setDashboardShowSecondaryReference: (dashboardShowSecondaryReference) => set({ dashboardShowSecondaryReference }),
      colorSchemePreference: "system",
      setColorSchemePreference: (colorSchemePreference) => set({ colorSchemePreference }),
      voiceSttLocale: "auto",
      setVoiceSttLocale: (voiceSttLocale) => set({ voiceSttLocale }),
    }),
    {
      name: "bakimate-ui-prefs-v1",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        dashboardShowSecondaryReference: s.dashboardShowSecondaryReference,
        colorSchemePreference: s.colorSchemePreference,
        voiceSttLocale: s.voiceSttLocale,
      }),
    },
  ),
);
