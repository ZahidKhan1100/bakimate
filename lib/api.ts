import axios from "axios";
import Constants from "expo-constants";

import { apiErrorMessage } from "@/lib/api-error-message";
import { useSessionStore } from "@/stores/session-store";

export { apiErrorMessage } from "@/lib/api-error-message";

/** Laravel routes are prefixed with `/api`; accept base host only to avoid accidental 404 / HTML errors. */
function withApiSuffix(url: string): string {
  const u = url.trim().replace(/\/+$/, "");
  return u.endsWith("/api") ? u : `${u}/api`;
}

const baseURL = withApiSuffix(
  process.env.EXPO_PUBLIC_API_URL ??
    (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl ??
    "http://127.0.0.1:8000",
);

/** Axios `baseURL` (includes `/api`). */
export const apiBaseUrl = baseURL;

export const api = axios.create({
  baseURL,
  timeout: 45_000,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

api.interceptors.response.use(
  (r) => r,
  (err: unknown) => {
    if (axios.isAxiosError(err) && err.response?.status === 401) {
      useSessionStore.getState().logout();
    }
    return Promise.reject(err);
  },
);

export function setAuthToken(token: string | null) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}
