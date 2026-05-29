import type { ConfigContext, ExpoConfig } from "expo/config";

/** Android OAuth uses `${android.package}:/oauthredirect`; it must resolve to the native app — not linger in Chrome. */
function oauthAndroidRedirectIntentFilter(androidPkg: string) {
  return {
    action: "VIEW",
    autoVerify: false as const,
    category: ["BROWSABLE", "DEFAULT"] as const,
    data: [{ scheme: androidPkg, pathPrefix: "/oauthredirect" }],
  };
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const prevExtra =
    typeof config.extra === "object" && config.extra !== null && !Array.isArray(config.extra)
      ? (config.extra as Record<string, unknown>)
      : {};

  const androidPkgRaw =
    typeof config.android === "object" &&
    config.android !== null &&
    "package" in config.android &&
    typeof (config.android as { package?: string }).package === "string"
      ? (config.android as { package?: string }).package?.trim()
      : undefined;
  const androidPkg =
    typeof androidPkgRaw === "string" && androidPkgRaw.length > 0 ? androidPkgRaw : "com.ihabimate.bakimate";

  const schemesFromConfig: string[] = Array.isArray(config.scheme)
    ? config.scheme.filter((s): s is string => typeof s === "string" && s.length > 0)
    : typeof config.scheme === "string" && config.scheme.length > 0
      ? [config.scheme]
      : ["bakimate"];

  /** `bakimate://…` links + **`${package}:/oauthredirect`** Custom Tabs return (matches `lib/google-auth.ts`). */
  const schemeMerged = [...new Set([...schemesFromConfig, androidPkg])];

  const prevAndroid =
    typeof config.android === "object" && config.android !== null ? ({ ...config.android } as ExpoConfig["android"]) : {};

  const existingIntentFilters = Array.isArray(prevAndroid.intentFilters) ? [...prevAndroid.intentFilters] : [];

  const hasOauthPkgFilter =
    !!prevAndroid.intentFilters &&
    prevAndroid.intentFilters.some((f) =>
      (f?.data ?? []).some(
        (d) =>
          typeof d === "object" &&
          d !== null &&
          "scheme" in d &&
          typeof (d as { scheme?: string }).scheme === "string" &&
          (d as { scheme: string }).scheme === androidPkg,
      ),
    );

  const androidNext: ExpoConfig["android"] = {
    ...(prevAndroid as NonNullable<ExpoConfig["android"]>),
    intentFilters: hasOauthPkgFilter
      ? existingIntentFilters
      : [...existingIntentFilters, oauthAndroidRedirectIntentFilter(androidPkg)],
  };

  return {
    ...config,
    scheme: schemeMerged,
    android: androidNext,
    plugins: [
      "expo-build-properties",
      [
        "react-native-share",
        {
          ios: ["whatsapp", "whatsapp-business"],
          android: ["com.whatsapp", "com.whatsapp.w4b"],
        },
      ],
      ...(Array.isArray(config.plugins) ? config.plugins : []),
      "expo-notifications",
      "expo-speech-recognition",
      "expo-sqlite",
      "./plugins/with-disable-ios-user-script-sandbox",
      /** Copies `storekit/BakiMate.storekit` and patches Run scheme unless `BAKIMATE_SKIP_STOREKIT_SCHEME=1` (Sandbox). */
      "./plugins/with-bakimate-storekit-testing",
    ],
    extra: {
      ...prevExtra,
      googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? String(prevExtra.googleIosClientId ?? ""),
      googleAndroidClientId:
        process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? String(prevExtra.googleAndroidClientId ?? ""),
      googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? String(prevExtra.googleWebClientId ?? ""),
      googleExpoClientId: process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID ?? String(prevExtra.googleExpoClientId ?? ""),
      googleOauthHttpsRedirect:
        (process.env.EXPO_PUBLIC_GOOGLE_OAUTH_HTTPS_REDIRECT ?? "").trim() ||
        (typeof prevExtra.googleOauthHttpsRedirect === "string" ? prevExtra.googleOauthHttpsRedirect.trim() : ""),
      /** RevenueCat **public** SDK keys (Project settings → API keys → app). Empty env still falls back to app.json */
      revenueCatIos:
        (process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY ?? "").trim() ||
        String(prevExtra.revenueCatIos ?? ""),
      revenueCatAndroid:
        (process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY ?? "").trim() ||
        String(prevExtra.revenueCatAndroid ?? ""),
      revenueCatPremiumEntitlementId:
        (process.env.EXPO_PUBLIC_REVENUECAT_PREMIUM_ENTITLEMENT_ID ?? "").trim() ||
        (typeof prevExtra.revenueCatPremiumEntitlementId === "string"
          ? prevExtra.revenueCatPremiumEntitlementId.trim()
          : "") ||
        "BakiMate Pro",
      /** Optional: force paywall to use this offering id from `offerings.all` (RevenueCat → Offerings). */
      revenueCatOfferingId:
        (process.env.EXPO_PUBLIC_REVENUECAT_OFFERING_ID ?? "").trim() ||
        (typeof prevExtra.revenueCatOfferingId === "string" ? prevExtra.revenueCatOfferingId.trim() : ""),
    },
  } as ExpoConfig;
};
