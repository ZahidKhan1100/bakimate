import { apiBaseUrl } from "@/lib/api";
import type { ShopApi } from "@/lib/api-types";
import { shopApiToProfile } from "@/lib/shop-profile";
import { useSessionStore } from "@/stores/session-store";

async function parseJsonSafely(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function messageFromFailedResponse(body: unknown, res: Response): string {
  if (typeof body === "object" && body !== null) {
    const o = body as Record<string, unknown>;
    if (typeof o.message === "string" && o.message.trim() !== "") {
      return o.message.trim();
    }
    const errs = o.errors;
    if (errs && typeof errs === "object") {
      const first = Object.values(errs as Record<string, unknown>).flatMap((v) =>
        Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [],
      )[0];
      if (typeof first === "string" && first.trim() !== "") {
        return first.trim();
      }
    }
  }
  const fallback = `${res.status} ${res.statusText}`.trim();
  return fallback || "Request failed";
}

function cacheShopFromApi(dto: ShopApi) {
  const uid = useSessionStore.getState().user?.id;
  if (uid != null) {
    useSessionStore.getState().setShopProfile(shopApiToProfile(dto));
  }
}

/**
 * POST multipart to Laravel `POST /shop/duitnow-qr`.
 * Uses `fetch` (not axios) so React Native can set the multipart boundary correctly — same pattern as `receipt-scan-api.ts`.
 */
export async function uploadShopDuitNowQr(asset: { uri: string; mimeType?: string | null }): Promise<ShopApi> {
  const token = useSessionStore.getState().token;
  if (!token) {
    throw new Error("Not authenticated");
  }

  const mimeRaw = (asset.mimeType ?? "").trim().toLowerCase();
  const mime = mimeRaw.includes("png")
    ? "image/png"
    : mimeRaw.includes("webp")
      ? "image/webp"
      : "image/jpeg";
  const ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : "jpg";

  const form = new FormData();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form.append("qr", { uri: asset.uri, type: mime, name: `duitnow.${ext}` } as any);

  const res = await fetch(`${apiBaseUrl}/shop/duitnow-qr`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: form,
  });

  const body = await parseJsonSafely(res);

  if (res.status === 401) {
    useSessionStore.getState().logout();
  }

  if (!res.ok) {
    throw new Error(messageFromFailedResponse(body, res));
  }

  if (!body || typeof body !== "object") {
    throw new Error("Invalid server response");
  }

  const data = body as ShopApi;
  cacheShopFromApi(data);
  return data;
}

export async function deleteShopDuitNowQr(): Promise<ShopApi> {
  const token = useSessionStore.getState().token;
  if (!token) {
    throw new Error("Not authenticated");
  }

  const res = await fetch(`${apiBaseUrl}/shop/duitnow-qr`, {
    method: "DELETE",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const body = await parseJsonSafely(res);

  if (res.status === 401) {
    useSessionStore.getState().logout();
  }

  if (!res.ok) {
    throw new Error(messageFromFailedResponse(body, res));
  }

  if (!body || typeof body !== "object") {
    throw new Error("Invalid server response");
  }

  const data = body as ShopApi;
  cacheShopFromApi(data);
  return data;
}
