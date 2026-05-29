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
