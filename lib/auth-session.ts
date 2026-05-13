import type { AuthResponse } from "@/lib/api-types";
import { shopApiToProfile } from "@/lib/shop-profile";
import { useSessionStore } from "@/stores/session-store";

/** Call after OAuth / demo login succeeds so shop data is cached for receipts & Profile. */
export function applyAuthResponseToSession(auth: AuthResponse): void {
  useSessionStore.getState().setSession(auth.token, auth.user);
  if (auth.shop) {
    useSessionStore.getState().setShopProfile(shopApiToProfile(auth.shop));
  }
}
