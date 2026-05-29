import AsyncStorage from "@react-native-async-storage/async-storage";
import { type Href, router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useRef } from "react";
import { ActivityIndicator, View } from "react-native";

import { GOOGLE_OAUTH_RETURN_HREF_KEY } from "@/lib/google-oauth-return-path";

import { BakimateColors } from "@/constants/bakimate-theme";

const DEFAULT_HREF = "/login" as const;

WebBrowser.maybeCompleteAuthSession();

/**
 * Native OAuth deep link (`${android.package}:/oauthredirect`, `bakimate://oauthredirect`).
 * Prefer **goBack** when the Login screen is still underneath so `Google.useIdTokenAuthRequest` keeps state;
 * Chrome otherwise stays stuck on google.com — see `app.config.ts` `intent-filter` + `scheme` merge.
 */
export default function GoogleOauthRedirect() {
  const doneRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await WebBrowser.dismissBrowser();
      } catch {
        /** ignore — common if no in-app browser */
      }

      /** Let `promptAsync`'s Native session capture the OAuth URL before we touch navigation. */
      await new Promise((r) => setTimeout(r, 50));

      let target: Href = DEFAULT_HREF;
      try {
        const stored = await AsyncStorage.getItem(GOOGLE_OAUTH_RETURN_HREF_KEY);
        await AsyncStorage.removeItem(GOOGLE_OAUTH_RETURN_HREF_KEY);
        const t = stored?.trim();
        if (t) target = t as Href;
      } catch {
        target = DEFAULT_HREF;
      }
      if (cancelled || doneRef.current) return;
      doneRef.current = true;

      if (router.canGoBack()) {
        router.back();
        return;
      }
      router.replace(target);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator size="large" color={BakimateColors.accentTeal} />
    </View>
  );
}
