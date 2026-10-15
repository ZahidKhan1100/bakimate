import { Platform } from "react-native";
import mobileAds, { MaxAdContentRating } from "react-native-google-mobile-ads";

let configured = false;
let inFlight: Promise<boolean> | null = null;

/**
 * Ensures the Google Mobile Ads SDK is initialized once, with ad content capped at "G" (general
 * audiences) — set in code so it can't drift from the AdMob dashboard setting. Returns whether the
 * SDK is ready to load/show ads.
 */
export function ensureAdMobConfigured(): Promise<boolean> {
  if (Platform.OS === "web") {
    return Promise.resolve(false);
  }

  if (configured) {
    return Promise.resolve(true);
  }

  if (!inFlight) {
    inFlight = (async (): Promise<boolean> => {
      try {
        await mobileAds().setRequestConfiguration({ maxAdContentRating: MaxAdContentRating.G });
        await mobileAds().initialize();
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
