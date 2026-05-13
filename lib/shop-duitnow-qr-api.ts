import axios from "axios";

import { api, apiBaseUrl } from "@/lib/api";
import type { ShopApi } from "@/lib/api-types";
import { shopApiToProfile } from "@/lib/shop-profile";
import { useSessionStore } from "@/stores/session-store";

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { Accept: "application/json" };
  const auth = api.defaults.headers.common.Authorization;
  if (typeof auth === "string") {
    headers.Authorization = auth;
  }
  return headers;
}

function cacheShopFromApi(dto: ShopApi) {
  const uid = useSessionStore.getState().user?.id;
  if (uid != null) {
    useSessionStore.getState().setShopProfile(shopApiToProfile(dto));
  }
}

export async function uploadShopDuitNowQr(asset: { uri: string; mimeType?: string | null }): Promise<ShopApi> {
  const mime = asset.mimeType ?? "image/jpeg";
  const ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : "jpg";
  const form = new FormData();
  form.append("qr", { uri: asset.uri, type: mime, name: `duitnow.${ext}` } as unknown as Blob);
  const { data } = await axios.post<ShopApi>(`${apiBaseUrl}/shop/duitnow-qr`, form, {
    headers: authHeaders(),
  });
  cacheShopFromApi(data);
  return data;
}

export async function deleteShopDuitNowQr(): Promise<ShopApi> {
  const { data } = await axios.delete<ShopApi>(`${apiBaseUrl}/shop/duitnow-qr`, {
    headers: authHeaders(),
  });
  cacheShopFromApi(data);
  return data;
}
