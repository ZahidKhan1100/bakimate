import Constants from "expo-constants";

/**
 * Public marketing site (privacy, terms, delete-account). Override with
 * `EXPO_PUBLIC_WEBSITE_URL` or `expo.extra.websiteUrl` in app.json.
 */
export function getWebsiteBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_WEBSITE_URL?.trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  const extra = Constants.expoConfig?.extra as { websiteUrl?: string } | undefined;
  const fromExtra = extra?.websiteUrl?.trim().replace(/\/$/, "");
  if (fromExtra) return fromExtra;
  return "https://bakimate.com";
}

export function getPrivacyPolicyUrl(): string {
  return `${getWebsiteBaseUrl()}/privacy`;
}

export function getTermsOfUseUrl(): string {
  return `${getWebsiteBaseUrl()}/terms`;
}

/** Public store page so users can rate/install the app from outside. */
export function getGooglePlayUrl(): string {
  return "https://play.google.com/store/apps/details?id=com.ihabimate.bakimate";
}

/** Public App Store page (Apple ID 6768776202). */
export function getAppStoreUrl(): string {
  return "https://apps.apple.com/app/bakimate/id6768776202";
}

/** Opens the App Store straight on the "Write a Review" sheet. */
export function getAppStoreReviewUrl(): string {
  return `${getAppStoreUrl()}?action=write-review`;
}
