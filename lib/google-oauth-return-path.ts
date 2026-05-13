import AsyncStorage from "@react-native-async-storage/async-storage";

/** Where to navigate after native Google redirects to `…/oauthredirect`. */
export const GOOGLE_OAUTH_RETURN_HREF_KEY = "bakimate_google_oauth_return_href";

export async function setGoogleOauthReturnHref(href: string): Promise<void> {
  await AsyncStorage.setItem(GOOGLE_OAUTH_RETURN_HREF_KEY, href);
}
