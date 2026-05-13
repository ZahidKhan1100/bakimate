import { useQueryClient } from "@tanstack/react-query";

import type { ShopApi } from "@/lib/api-types";
import { Qk } from "@/lib/hooks/query-keys";
import { normalizeCurrencyCode, DEFAULT_SHOP_CURRENCY } from "@/lib/money";
import { resolveShopProfile } from "@/lib/shop-profile";
import { useSessionStore } from "@/stores/session-store";

export { normalizeCurrencyCode, DEFAULT_SHOP_CURRENCY };

/**
 * Resolved shop bookkeeping currency — prefers fresh React Query `/shop`,
 * falls back on persisted Profile draft (`MYR` when absent).
 */
export function useShopCurrency(): string {
  const userId = useSessionStore((s) => s.user?.id);
  const profiles = useSessionStore((s) => s.shopProfiles);
  const qc = useQueryClient();
  const remote = qc.getQueryData<ShopApi>(Qk.shopProfile);
  const fromRemote = remote?.primary_currency_code;
  if (fromRemote?.trim()) {
    return normalizeCurrencyCode(fromRemote);
  }
  const local = resolveShopProfile(profiles, userId).primaryCurrencyCode;

  return normalizeCurrencyCode(local || DEFAULT_SHOP_CURRENCY);
}
