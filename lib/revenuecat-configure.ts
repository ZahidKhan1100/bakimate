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
        /**
         * Install before `configure` so the SDK does not register its default handler (which uses
         * `console.error` and triggers LogBox on expected INVALID_RECEIPT during Xcode StoreKit testing).
         */
        Purchases.setLogHandler((level, message) => {
          const lower = `${message}`.toLowerCase();
          if (
            __DEV__ &&
            Platform.OS === "ios" &&
            (lower.includes("invalid receipt") || lower.includes("receipt is not valid"))
          ) {
            console.log(`[RevenueCat] ${message}`);
            return;
          }
          /** Offerings/Product fetch failures are configuration (ASC / RC dashboard), not app crashes — avoid LogBox ERROR spam in dev. */
          if (__DEV__) {
            const isOfferingsConfigNoise =
              lower.includes("offeringsmanager") ||
              lower.includes("error fetching offerings") ||
              lower.includes("none of the products registered") ||
              lower.includes("could not be fetched from app store connect") ||
              lower.includes("couldn't be fetched from app store connect") ||
              lower.includes("why-are-offerings-empty") ||
              (lower.includes("issue with your configuration") && lower.includes("check the underlying error"));
            if (
              level === Purchases.LOG_LEVEL.ERROR &&
              (lower.includes("issue with your configuration") || isOfferingsConfigNoise)
            ) {
              console.warn(`[RevenueCat] ${message}`);
              return;
            }
            /** Sandbox auth / AMS errors surface as STORE_PROBLEM — expected during bad Sandbox sign-in, not JS bugs.
             *  RC emits a long line (product purchase + readable_error_code) plus a shorter duplicate ERROR (“problem with the App Store.”). */
            const isIosStorePurchaseNoise =
              lower.includes("readable_error_code=store_problem") ||
              lower.includes("readable_error_code: store_problem") ||
              /\bstore_problem\b/.test(lower) ||
              (lower.includes("product purchase") &&
                lower.includes("failed") &&
                (lower.includes("problem with the app store") || lower.includes("store_problem"))) ||
              /** Short follow-up RC log on iOS STORE_PROBLEM (no substring match above). */
              (Platform.OS === "ios" && lower.includes("problem with the app store"));
            if (level === Purchases.LOG_LEVEL.ERROR && isIosStorePurchaseNoise) {
              console.warn(`[RevenueCat] ${message}`);
              return;
            }
          }
          const line = `[RevenueCat] ${message}`;
          switch (level) {
            case Purchases.LOG_LEVEL.DEBUG:
            case Purchases.LOG_LEVEL.VERBOSE:
              console.debug(line);
              break;
            case Purchases.LOG_LEVEL.INFO:
              console.info(line);
              break;
            case Purchases.LOG_LEVEL.WARN:
              console.warn(line);
              break;
            case Purchases.LOG_LEVEL.ERROR:
              console.error(line);
              break;
            default:
              console.log(line);
          }
        });
        Purchases.setLogLevel(Purchases.LOG_LEVEL.WARN);
        /** Simulator + Xcode `.storekit` often fails with StoreKit 2 (hits Apple APIs / timeouts). SK1 resolves local catalog. */
        const iosSimulatorDebugStoreKit1 =
          __DEV__ && Platform.OS === "ios" ? { storeKitVersion: Purchases.STOREKIT_VERSION.STOREKIT_1 } : {};
        Purchases.configure({ apiKey: key, ...iosSimulatorDebugStoreKit1 });
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
