import { api, apiErrorMessage } from "@/lib/api";
import type { AuthResponse, CheckEmailVerifiedResponse } from "@/lib/api-types";

export function authApiErrorMessage(e: unknown): string {
  return apiErrorMessage(e);
}

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
 * POST /api/auth/demo — for scripts or review builds only (not used on the login screen).
 * Backend returns 403 when demo login is disabled.
 */
export async function loginWithDemo(): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>("/auth/demo", {});
  return data;
}

export async function registerWithEmail(payload: {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>("/auth/register", payload);
  return data;
}

export async function loginWithEmail(payload: { email: string; password: string }): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>("/auth/login", payload);
  return data;
}

export async function requestPasswordReset(email: string): Promise<{ message: string }> {
  const { data } = await api.post<{ message: string }>("/auth/forgot-password", { email });
  return data;
}

export async function resetPasswordWithToken(payload: {
  email: string;
  token: string;
  password: string;
  password_confirmation: string;
}): Promise<{ message: string }> {
  const { data } = await api.post<{ message: string }>("/auth/reset-password", payload);
  return data;
}

/** Same polling contract as HabiMate: `{ email_verified: false }` or full auth once verified. */
export async function checkEmailVerified(email: string): Promise<CheckEmailVerifiedResponse> {
  const { data } = await api.post<CheckEmailVerifiedResponse>("/auth/check-email-verified", { email });
  return data;
}

export async function deleteAuthenticatedAccount(): Promise<{ message: string }> {
  const { data } = await api.delete<{ message: string }>("/auth/account");

  return data;
}
