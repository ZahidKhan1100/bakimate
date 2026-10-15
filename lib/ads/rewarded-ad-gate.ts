import { Platform } from "react-native";
import { AdEventType, RewardedAd, RewardedAdEventType } from "react-native-google-mobile-ads";

import { ensureAdMobConfigured } from "@/lib/ads/admob-configure";
import { getRewardedAdUnitId } from "@/lib/ads/admob-settings";
import { MONETIZATION_ENABLED } from "@/lib/monetization";
import type { PremiumRecordingAccess } from "@/lib/premium-recording-access";

const LOAD_TIMEOUT_MS = 8_000;

/**
 * Shows a rewarded ad before a WhatsApp send (PDF or text) when the shop has no active
 * subscription/trial. Always fails open — on web, when AdMob can't init, on load timeout/error,
 * or once the ad closes — so an ad-network hiccup never blocks the user's send.
 */
export async function presentRewardedAdGate(access: PremiumRecordingAccess | undefined): Promise<void> {
  const needsAd = MONETIZATION_ENABLED && access?.requiresPremium === true && !access.entitled;
  if (!needsAd || Platform.OS === "web") {
    return;
  }

  const ready = await ensureAdMobConfigured();
  if (!ready) {
    return;
  }

  const rewarded = RewardedAd.createForAdRequest(getRewardedAdUnitId(), {
    requestNonPersonalizedAdsOnly: true,
  });

  await new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      unsubscribeLoaded();
      unsubscribeError();
      unsubscribeClosed();
      resolve();
    };

    const timer = setTimeout(finish, LOAD_TIMEOUT_MS);

    const unsubscribeLoaded = rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
      clearTimeout(timer);
      rewarded.show();
    });
    const unsubscribeClosed = rewarded.addAdEventListener(AdEventType.CLOSED, finish);
    const unsubscribeError = rewarded.addAdEventListener(AdEventType.ERROR, finish);

    rewarded.load();
  });
}
