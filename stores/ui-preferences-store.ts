import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import i18n, { APP_LANGUAGES, type AppLanguage } from "@/lib/i18n";
import type { VoiceSttLocalePreference } from "@/lib/voice-stt-locale";
import { sanitizeVoiceSttLocale } from "@/lib/voice-stt-locale";

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
  /** Language picked in Settings; null follows the device language. */
  appLanguage: AppLanguage | null;
  setAppLanguage: (v: AppLanguage) => void;
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
      appLanguage: null,
      setAppLanguage: (appLanguage) => {
        void i18n.changeLanguage(appLanguage);
        set({ appLanguage });
      },
    }),
    {
      name: "bakimate-ui-prefs-v1",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        dashboardShowSecondaryReference: s.dashboardShowSecondaryReference,
        colorSchemePreference: s.colorSchemePreference,
        voiceSttLocale: s.voiceSttLocale,
        appLanguage: s.appLanguage,
      }),
      onRehydrateStorage: () => (state) => {
        const lang = state?.appLanguage;
        if (lang && APP_LANGUAGES.includes(lang) && i18n.language !== lang) {
          void i18n.changeLanguage(lang);
        }
      },
      version: 2,
      migrate: (persisted) => {
        const state = persisted as { voiceSttLocale?: string } | undefined;
        if (!state || typeof state.voiceSttLocale !== "string") {
          return persisted;
        }
        return {
          ...state,
          voiceSttLocale: sanitizeVoiceSttLocale(state.voiceSttLocale),
        };
      },
    },
  ),
);
