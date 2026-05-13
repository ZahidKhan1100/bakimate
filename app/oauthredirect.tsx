import AsyncStorage from "@react-native-async-storage/async-storage";
import { type Href, useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { View } from "react-native";

import { GOOGLE_OAUTH_RETURN_HREF_KEY } from "@/lib/google-oauth-return-path";

const DEFAULT_HREF = "/login" as const;

/**
 * Native redirect target after Google OAuth: `…/oauthredirect` on package or reversed iOS scheme.
 */
export default function GoogleOauthRedirect() {
  const router = useRouter();
  const doneRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
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
      router.replace(target);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return <View style={{ flex: 1 }} />;
}
