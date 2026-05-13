import { Platform } from "react-native";
import Purchases from "react-native-purchases";

import { getNativeRevenueCatApiKey, warnIfRevenueCatKeyWrongPlatform } from "@/lib/revenuecat-settings";

let configured = false;
let inFlight: Promise<boolean> | null = null;

/**
 * Ensures Purchases.configure ran once when a native RevenueCat SDK key exists.
 * Returns whether the SDK is ready for API calls (`getCustomerInfo`, purchases, …).
 */
export function ensureRevenueCatConfigured(): Promise<boolean> {
  if (Platform.OS === "web") {
    return Promise.resolve(false);
  }

  const key = getNativeRevenueCatApiKey();
  if (!key) {
    return Promise.resolve(false);
  }

  warnIfRevenueCatKeyWrongPlatform(key);

  if (configured) {
    return Promise.resolve(true);
  }

  if (!inFlight) {
    inFlight = (async (): Promise<boolean> => {
      try {
        Purchases.setLogLevel(Purchases.LOG_LEVEL.WARN);
        await Purchases.configure({ apiKey: key });
        configured = true;

        return true;
      } catch {
        configured = false;

        return false;
      } finally {
        inFlight = null;
      }
    })();
  }

  return inFlight;
}
