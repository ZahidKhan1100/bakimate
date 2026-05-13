import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { setAuthToken } from "@/lib/api";
import type { AuthUser, ShopProfile } from "@/lib/api-types";
import { emptyShopProfile } from "@/lib/shop-profile";

type SessionState = {
  token: string | null;
  user: AuthUser | null;
  /** Keyed by `String(user.id)` — each login keeps its own shop form. */
  shopProfiles: Record<string, ShopProfile>;
  setSession: (token: string | null, user?: AuthUser | null) => void;
  logout: () => void;
  setShopProfile: (patch: Partial<ShopProfile>) => void;
};

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      shopProfiles: {},
      setSession: (token, user = null) => {
        setAuthToken(token);
        set({ token, user: user ?? null });
      },
      logout: () => {
        setAuthToken(null);
        set({ token: null, user: null });
      },
      setShopProfile: (patch) =>
        set((s) => {
          const uid = s.user?.id;
          if (uid == null) {
            return {};
          }
          const key = String(uid);
          const cur = { ...emptyShopProfile(), ...(s.shopProfiles[key] ?? {}) };

          return {
            shopProfiles: {
              ...s.shopProfiles,
              [key]: { ...cur, ...patch },
            },
          };
        }),
    }),
    {
      name: "bakimate-session",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ token: s.token, user: s.user, shopProfiles: s.shopProfiles }),
      /** Older installs had no `shopProfiles` — default to `{}`. */
      merge: (persistedState, currentState) => {
        const p = persistedState as Partial<SessionState> | null | undefined;
        return {
          ...currentState,
          ...p,
          shopProfiles: p?.shopProfiles && typeof p.shopProfiles === "object" ? p.shopProfiles : {},
        };
      },
      onRehydrateStorage: () => (state) => {
        if (state?.token) setAuthToken(state.token);
      },
    },
  ),
);
