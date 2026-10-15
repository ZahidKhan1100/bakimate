import * as Localization from "expo-localization";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "@/locales/en.json";
import ms from "@/locales/ms.json";
import ur from "@/locales/ur.json";

const resources = {
  en: { translation: en },
  ms: { translation: ms },
  ur: { translation: ur },
};

export type AppLanguage = keyof typeof resources;

export const APP_LANGUAGES: AppLanguage[] = ["en", "ms", "ur"];

/** Device language when the user has not picked one in Settings. */
function deviceLanguage(): AppLanguage {
  const code = Localization.getLocales()[0]?.languageCode ?? "";
  return APP_LANGUAGES.find((l) => code.startsWith(l)) ?? "en";
}

void i18n.use(initReactI18next).init({
  resources,
  lng: deviceLanguage(),
  fallbackLng: "en",
  interpolation: { escapeValue: false },
  compatibilityJSON: "v4",
});

export default i18n;
