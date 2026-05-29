/**
 * Google OAuth returns **`com.<package>:/oauthredirect?…`** (opaque URI). Expo Router may not map
 * that to `app/oauthredirect.tsx` and shows “No route found”. Rewrite anything containing `oauthredirect`
 * to **`/oauthredirect`**, preserving **`?` / `#`** so `WebBrowser` + `AuthSession` can finish.
 *
 * @see https://docs.expo.dev/router/advanced/native-intent/
 */
export function redirectSystemPath({ path, initial }: { path: string; initial: boolean }): string {
  void initial;
  try {
    if (typeof path !== "string") return "/";
    const lower = path.toLowerCase();
    const key = "oauthredirect";
    const ix = lower.indexOf(key);
    if (ix < 0) return path;

    const tail = path.slice(ix + key.length);
    let suffix = "";
    if (tail.startsWith("?") || tail.startsWith("#")) {
      suffix = tail;
    } else if (tail.startsWith(":")) {
      const qh = tail.search(/[?#]/);
      if (qh >= 0) suffix = tail.slice(qh);
    } else if (tail.startsWith("/")) {
      const qh = tail.search(/[?#]/);
      if (qh >= 0) suffix = tail.slice(qh);
    }

    return `/oauthredirect${suffix}`;
  } catch {
    return "/oauthredirect";
  }
}
