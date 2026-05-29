import { api } from "@/lib/api";
import type { ShopApi } from "@/lib/api-types";
import { shopApiToProfile } from "@/lib/shop-profile";
import { useSessionStore } from "@/stores/session-store";

export type ShopPatchBody = {
  name: string;
  primary_currency_code: string;
  location: string | null;
  contact: string | null;
  payment_instructions: string | null;
  credit_quick_items: string[] | null;
  reference_currency_code: string | null;
  reference_currency_per_myr: number | null;
};

export async function fetchShopProfile(opts?: { timeoutMs?: number }): Promise<ShopApi> {
  const { data } = await api.get<ShopApi>("/shop", {
    ...(opts?.timeoutMs != null ? { timeout: opts.timeoutMs } : {}),
  });
  const uid = useSessionStore.getState().user?.id;
  if (uid != null) {
    useSessionStore.getState().setShopProfile(shopApiToProfile(data));
  }
  return data;
}

export async function patchShopProfile(body: ShopPatchBody): Promise<ShopApi> {
  const { data } = await api.patch<ShopApi>("/shop", body);
  const uid = useSessionStore.getState().user?.id;
  if (uid != null) {
    useSessionStore.getState().setShopProfile(shopApiToProfile(data));
  }
  return data;
}
