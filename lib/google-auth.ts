import * as Application from "expo-application";
import * as AuthSession from "expo-auth-session";
import Constants from "expo-constants";
import type { GoogleAuthRequestConfig } from "expo-auth-session/providers/google";
import { Platform } from "react-native";

import type { GoogleOAuthClientIds } from "@/lib/auth-google-config";

const EMPTY: GoogleOAuthClientIds = {};

function readExtraGoogle(): GoogleOAuthClientIds {
  const extra = Constants.expoConfig?.extra as Record<string, string | undefined> | undefined;
  if (!extra) {
    return EMPTY;
  }
  return {
    googleIosClientId: extra.googleIosClientId,
    googleAndroidClientId: extra.googleAndroidClientId,
    googleWebClientId: extra.googleWebClientId,
    googleExpoClientId: extra.googleExpoClientId,
  };
}

/** Same pattern as HabiMate: Web + native clients; optional expo client (= Web ID for Expo Go proxy). */
export function getGoogleOAuthClientIds(): GoogleOAuthClientIds {
  const fromExtra = readExtraGoogle();
  return {
    googleIosClientId:
      process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? fromExtra.googleIosClientId ?? "",
    googleAndroidClientId:
      process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? fromExtra.googleAndroidClientId ?? "",
    googleWebClientId:
      process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? fromExtra.googleWebClientId ?? "",
    googleExpoClientId:
      process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID ?? fromExtra.googleExpoClientId ?? "",
  };
}

/** True in the Expo Go shell — legacy `auth.expo.io` redirect parity with HabiMate. */
export function shouldUseGoogleAuthProxy(): boolean {
  return Constants.appOwnership === "expo";
}

/**
 * Authorized redirect URIs on the Google **Web** client must include this exact URL when using Expo Go + proxy.
 * Set `EXPO_PUBLIC_EXPO_PROXY_PATH=@YOUR_EXPO_USER/bakimate` when `app.json` has no owner/slug publishing context.
 *
 * Prefer dev builds (`expo run:*` / `--dev-client`) instead of relying on proxy long term.
 */
export function getAuthExpoProxyRedirectUri(): string {
  const explicit = process.env.EXPO_PUBLIC_EXPO_PROXY_PATH?.trim();
  if (explicit?.startsWith("https://")) {
    return explicit;
  }

  let segment: string;
  if (explicit) {
    segment = explicit.startsWith("@") ? explicit : `@${explicit}`;
  } else {
    const ex = Constants.expoConfig;
    segment =
      ex?.owner && ex?.slug ? `@${ex.owner}/${ex.slug}` : ("@anonymous/bakimate" as const);
  }
  return `https://auth.expo.io/${segment}`;
}

export function getGoogleIosReversedOauthRedirectUri(iosClientId: string): string {
  const idPart = iosClientId.replace(/\.apps\.googleusercontent\.com$/i, "");
  return `com.googleusercontent.apps.${idPart}:/oauthredirect`;
}

/**
 * OAuth client IDs for `Google.useIdTokenAuthRequest` — Expo Go reuses Web / Expo ID on every OS field (HabiMate pattern).
 */
export function buildGoogleOAuthRequestCredentials(): {
  iosClientId: string;
  androidClientId: string;
  webClientId: string;
} {
  const ids = getGoogleOAuthClientIds();
  const expoOrWeb =
    ids.googleExpoClientId?.trim() || ids.googleWebClientId?.trim() || "";
  if (shouldUseGoogleAuthProxy()) {
    const id = expoOrWeb;
    return {
      iosClientId: id,
      androidClientId: id,
      webClientId: ids.googleWebClientId?.trim() || id,
    };
  }

  /** Web/expo IDs can stand in when a native OAuth client isn't set yet (still add redirects on the Web client in GCP). */
  const fillNative = expoOrWeb;
  const webForRequest = ids.googleWebClientId?.trim() || ids.googleExpoClientId?.trim() || "";
  return {
    iosClientId:
      ids.googleIosClientId?.trim() ||
      (Platform.OS === "ios" ? fillNative : ""),
    androidClientId:
      ids.googleAndroidClientId?.trim() ||
      (Platform.OS === "android" ? fillNative : ""),
    webClientId: webForRequest || fillNative,
  };
}

export function resolveGoogleOAuthRedirectUri(): string {
  if (shouldUseGoogleAuthProxy()) {
    return getAuthExpoProxyRedirectUri();
  }

  const ids = getGoogleOAuthClientIds();

  if (Platform.OS === "ios") {
    const cid = ids.googleIosClientId?.trim() ?? "";
    if (!cid) {
      return AuthSession.makeRedirectUri({
        native: `${Application.applicationId ?? "com.ihabimate.bakimate"}:/oauthredirect`,
      });
    }
    return getGoogleIosReversedOauthRedirectUri(cid);
  }

  const pkg =
    Application.applicationId?.trim() && Application.applicationId.trim() !== ""
      ? Application.applicationId.trim()
      : "com.ihabimate.bakimate";

  return `${pkg}:/oauthredirect`;
}

export function buildGoogleIdTokenAuthRequestPartialConfig(): Partial<GoogleAuthRequestConfig> {
  const creds = buildGoogleOAuthRequestCredentials();
  // Do not coerce "" → undefined — expo-google throws if iosClientId / androidClientId is undefined on native.
  return {
    iosClientId: creds.iosClientId,
    androidClientId: creds.androidClientId,
    webClientId: creds.webClientId,
    redirectUri: resolveGoogleOAuthRedirectUri(),
    selectAccount: true,
  };
}
