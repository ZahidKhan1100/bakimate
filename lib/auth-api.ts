import { api, setAuthToken } from "@/lib/api";
import type { AuthResponse } from "@/lib/api-types";

export async function loginWithGoogleIdToken(idToken: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>("/auth/google", { id_token: idToken });
  return data;
}

export async function loginWithAppleIdToken(idToken: string, fullName?: string | null): Promise<AuthResponse> {
  const body: Record<string, string> = { id_token: idToken };
  const n = typeof fullName === "string" ? fullName.trim() : "";
  if (n !== "") {
    body.full_name = n;
  }
  const { data } = await api.post<AuthResponse>("/auth/apple", body);
  return data;
}

/**
 * Hits POST /api/auth/demo to sign in as the seeded demo user (Apple App Review
 * flow). Backend returns 403 when DEMO_LOGIN_ENABLED is unset/false on the
 * server, so this is safe to expose in the UI in any build.
 */
export async function loginWithDemo(): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>("/auth/demo", {});
  return data;
}
