import Purchases from "react-native-purchases";

/** RevenueCat `/ invalid receipt — common with Xcode StoreKit Configuration purchases. */
export function isPurchasesInvalidReceiptError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  const err = error as {
    code?: string | number;
    readableErrorCode?: string;
    userInfo?: { readableErrorCode?: string };
  };
  if (err.code === Purchases.PURCHASES_ERROR_CODE.INVALID_RECEIPT_ERROR) {
    return true;
  }
  const readable = err.userInfo?.readableErrorCode ?? err.readableErrorCode;
  return readable === "INVALID_RECEIPT";
}

/** RevenueCat STORE_PROBLEM — usually App Store Sandbox auth (`AMSErrorDomain` 100) or outages. */
export function isPurchasesStoreProblemError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  const err = error as {
    code?: string | number;
    readableErrorCode?: string;
    userInfo?: { readableErrorCode?: string };
  };
  const sku = Purchases.PURCHASES_ERROR_CODE.STORE_PROBLEM_ERROR;
  if (err.code === sku || err.code === 2 || `${err.code}` === "2") {
    return true;
  }
  const fromInfo = err.userInfo?.readableErrorCode;
  const readable =
    typeof fromInfo === "string"
      ? fromInfo
      : typeof err.readableErrorCode === "string"
        ? err.readableErrorCode
        : undefined;
  return readable === "STORE_PROBLEM";
}
