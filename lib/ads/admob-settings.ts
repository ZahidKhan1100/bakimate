import Constants from "expo-constants";
import { Platform } from "react-native";
import { TestIds } from "react-native-google-mobile-ads";

function readExtra(): Record<string, unknown> {
  const ex = Constants.expoConfig?.extra;

  return typeof ex === "object" && ex !== null && !Array.isArray(ex) ? (ex as Record<string, unknown>) : {};
}

/**
 * Rewarded ad unit ID for the current native platform.
 * Falls back to Google's public test unit ID when unset or in `__DEV__`, so the ad-gate flow
 * is testable before a real AdMob account/ad units exist (AdMob → Ad units → Rewarded).
 */
export function getRewardedAdUnitId(): string {
  const ex = readExtra();
  const raw = Platform.OS === "ios" ? ex.admobIosRewardedUnitId : ex.admobAndroidRewardedUnitId;
  const configured = typeof raw === "string" ? raw.trim() : "";

  return !__DEV__ && configured !== "" ? configured : TestIds.REWARDED;
}
