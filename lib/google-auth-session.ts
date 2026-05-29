import type { AuthSessionResult } from "expo-auth-session";

/**
 * Google OAuth via expo-auth-session returns an id_token after the exchange completes.
 * The first success payload may omit `params.id_token` — read `authentication.idToken` too
 * (houseexpenses-new / expo-auth-session pattern).
 */
export function getGoogleIdTokenFromAuthResponse(response: AuthSessionResult | null): string | null {
  if (!response || response.type !== "success") return null;
  const fromParams = response.params?.id_token;
  const idFromAuth = response.authentication?.idToken;
  const token =
    typeof fromParams === "string" && fromParams.length > 0
      ? fromParams
      : typeof idFromAuth === "string" && idFromAuth.length > 0
        ? idFromAuth
        : null;
  return token;
}
