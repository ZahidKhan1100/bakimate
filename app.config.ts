import type { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => {
  const prevExtra =
    typeof config.extra === "object" && config.extra !== null && !Array.isArray(config.extra)
      ? (config.extra as Record<string, unknown>)
      : {};

  return {
    ...config,
    plugins: [
      ...(Array.isArray(config.plugins) ? config.plugins : []),
      "expo-notifications",
      "expo-speech-recognition",
      "expo-sqlite",
      "./plugins/with-disable-ios-user-script-sandbox",
    ],
    extra: {
      ...prevExtra,
      googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? String(prevExtra.googleIosClientId ?? ""),
      googleAndroidClientId:
        process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? String(prevExtra.googleAndroidClientId ?? ""),
      googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? String(prevExtra.googleWebClientId ?? ""),
      googleExpoClientId: process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID ?? String(prevExtra.googleExpoClientId ?? ""),
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
