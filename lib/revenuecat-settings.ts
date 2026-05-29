import Constants from "expo-constants";
import { Platform } from "react-native";

function readExtra(): Record<string, unknown> {
  const ex = Constants.expoConfig?.extra;

  return typeof ex === "object" && ex !== null && !Array.isArray(ex) ? (ex as Record<string, unknown>) : {};
}

/** Public SDK API key for the current native platform (not used on web). */
export function getNativeRevenueCatApiKey(): string {
  const ex = readExtra();
  const raw =
    Platform.OS === "ios"
      ? ex.revenueCatIos
      : Platform.OS === "android"
        ? ex.revenueCatAndroid
        : "";

  return typeof raw === "string" ? raw.trim() : "";
}

/**
 * DEV-only hint: mismatched platform keys often produce HTTP 404 when fetching offerings.
 * Apple App Store SDK keys normally start with `appl_`, Google Play with `goog_`.
 */
export function warnIfRevenueCatKeyWrongPlatform(apiKey: string): void {
  if (!__DEV__ || typeof apiKey !== "string") {
    return;
  }

  const key = apiKey.trim();
  if (!key) {
    return;
  }

  if (Platform.OS === "ios" && key.startsWith("goog_")) {
    console.warn(
      "[BakiMate][RevenueCat] This iOS build uses a Play Store SDK key (`goog_`). Use the Apple App Store **public** key (`appl_…`) from RevenueCat → Project settings → API keys. Wrong keys commonly cause offerings errors (e.g. 404).",
    );
  }

  if (Platform.OS === "android" && key.startsWith("appl_")) {
    console.warn(
      "[BakiMate][RevenueCat] This Android build uses an Apple SDK key (`appl_`). Use the Google Play **public** key (`goog_…`) from RevenueCat → API keys.",
    );
  }
}

/**
 * Entitlement **identifier** string from RevenueCat (Product catalog → Entitlements → Identifier).
 * Must match **exactly** (case-sensitive). Wrong value ⇒ `customerInfo.entitlements.active` never hits after purchase.
 * If you changed `EXPO_PUBLIC_REVENUECAT_PREMIUM_ENTITLEMENT_ID`, rebuild the native app so `extra` picks it up.
 */
export function getPremiumEntitlementIdentifier(): string {
  const ex = readExtra();
  const raw = ex.revenueCatPremiumEntitlementId;
  const s = typeof raw === "string" ? raw.trim() : "";

  return s !== "" ? s : "BakiMate Pro";
}

/**
 * Optional RevenueCat offering identifier (Paywall → Product catalog → Offerings).
 * When set, the paywall loads `offerings.all[thisId]` instead of only `offerings.current`.
 * Use when your real products are under a non-default offering or `current` still points at a template.
 */
export function getRevenueCatOfferingIdentifier(): string {
  const ex = readExtra();
  const raw = ex.revenueCatOfferingId;
  const s = typeof raw === "string" ? raw.trim() : "";

  return s;
}
