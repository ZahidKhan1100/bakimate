/** Thrown when a native build with RevenueCat configured blocks recording without an active entitlement. */
export class PremiumRecordingBlockedError extends Error {
  readonly code = "PREMIUM_REQUIRED" as const;

  constructor() {
    super("PREMIUM_REQUIRED");
    this.name = "PremiumRecordingBlockedError";
  }
}

export function isPremiumRecordingBlockedError(e: unknown): e is PremiumRecordingBlockedError {
  return e instanceof PremiumRecordingBlockedError;
}
