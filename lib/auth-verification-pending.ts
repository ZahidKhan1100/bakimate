import AsyncStorage from "@react-native-async-storage/async-storage";

/** Same idea as HabiMate `pending_email` — used until `check-email-verified` returns a token. */
export const PENDING_VERIFICATION_EMAIL_KEY = "bakimate_pending_verification_email";

export async function setPendingVerificationEmail(email: string): Promise<void> {
  await AsyncStorage.setItem(PENDING_VERIFICATION_EMAIL_KEY, email.trim().toLowerCase());
}

export async function clearPendingVerificationEmail(): Promise<void> {
  await AsyncStorage.removeItem(PENDING_VERIFICATION_EMAIL_KEY);
}

export async function getPendingVerificationEmail(): Promise<string | null> {
  return AsyncStorage.getItem(PENDING_VERIFICATION_EMAIL_KEY);
}
