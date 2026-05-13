import Constants from "expo-constants";
import { Platform } from "react-native";

export type GoogleOAuthClientIds = {
  googleIosClientId?: string;
  googleAndroidClientId?: string;
  googleWebClientId?: string;
  /** Optional; Expo Go OAuth usually reuses Web client — same env as Laravel `GOOGLE_CLIENT_IDS`. */
  googleExpoClientId?: string;
};

/** True when Google OAuth client IDs are wired for the current runtime (native vs Expo Go). */
export function isGoogleOAuthConfigured(ids: GoogleOAuthClientIds | undefined): boolean {
  if (!ids) {
    return false;
  }

  const proxy = Constants.appOwnership === "expo";
  const web = (ids.googleWebClientId ?? "").trim();
  const expoFallback = (ids.googleExpoClientId ?? "").trim() || web;

  if (proxy) {
    return Boolean(expoFallback);
  }

  if (!expoFallback) {
    return false;
  }

  if (Platform.OS === "ios") {
    return Boolean((ids.googleIosClientId ?? "").trim() || expoFallback);
  }

  if (Platform.OS === "android") {
    return Boolean((ids.googleAndroidClientId ?? "").trim() || expoFallback);
  }

  if (Platform.OS === "web") {
    return true;
  }

  return false;
}
