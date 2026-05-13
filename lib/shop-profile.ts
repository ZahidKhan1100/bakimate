import type { ShopApi, ShopProfile } from "@/lib/api-types";
import { normalizeCurrencyCode } from "@/lib/money";
import type { ReceiptShopBlurb } from "@/lib/payment-receipt";

export function parseQuickItemsLines(lines: string): string[] {
  const parts = lines.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);

  return Array.from(new Set(parts));
}

export function formatQuickItemsDraft(items: string[]): string {
  return items.filter((s) => s.trim()).join("\n");
}

export function emptyShopProfile(): ShopProfile {
  return {
    shopName: "",
    primaryCurrencyCode: "MYR",
    shopLocation: "",
    shopContact: "",
    paymentInstructions: "",
    quickItemsLines: "",
    referenceCurrencyCode: "",
    referenceCurrencyPerMyrText: "",
    duitnowQrUrl: null,
  };
}

export function resolveShopProfile(
  profiles: Record<string, ShopProfile> | undefined,
  userId: number | undefined,
): ShopProfile {
  if (userId == null) {
    return emptyShopProfile();
  }
  return profiles?.[String(userId)] ?? emptyShopProfile();
}

export function shopApiToProfile(api: ShopApi): ShopProfile {
  return {
    shopName: api.name,
    primaryCurrencyCode: normalizeCurrencyCode(api.primary_currency_code),
    shopLocation: api.location ?? "",
    shopContact: api.contact ?? "",
    paymentInstructions: api.payment_instructions ?? "",
    quickItemsLines: formatQuickItemsDraft(api.credit_quick_items ?? []),
    referenceCurrencyCode: api.reference_currency_code?.trim() ?? "",
    referenceCurrencyPerMyrText:
      api.reference_currency_per_myr != null && Number.isFinite(api.reference_currency_per_myr)
        ? String(api.reference_currency_per_myr)
        : "",
    duitnowQrUrl: api.duitnow_qr_url ?? null,
  };
}

export function localProfileToShopPatch(p: ShopProfile): {
  name: string;
  primary_currency_code: string;
  location: string | null;
  contact: string | null;
  payment_instructions: string | null;
  credit_quick_items: string[] | null;
  reference_currency_code: string | null;
  reference_currency_per_myr: number | null;
} {
  const name = p.shopName.trim();
  const quick = parseQuickItemsLines(p.quickItemsLines);
  return {
    name: name === "" ? "My Shop" : name,
    primary_currency_code: normalizeCurrencyCode(p.primaryCurrencyCode),
    location: p.shopLocation.trim() === "" ? null : p.shopLocation.trim(),
    contact: p.shopContact.trim() === "" ? null : p.shopContact.trim(),
    payment_instructions: p.paymentInstructions.trim() === "" ? null : p.paymentInstructions.trim(),
    credit_quick_items: quick.length > 0 ? quick : null,
    /** Reference currency removed from the app UI — always clear on save. */
    reference_currency_code: null,
    reference_currency_per_myr: null,
  };
}

export function profileToReceiptBlurb(p: ShopProfile): ReceiptShopBlurb {
  return {
    shopName: p.shopName.trim() || undefined,
    shopLocation: p.shopLocation.trim() || undefined,
    shopContact: p.shopContact.trim() || undefined,
    paymentInstructions: p.paymentInstructions.trim() || undefined,
    hasDuitNowQr: Boolean(p.duitnowQrUrl?.trim()),
    currencyCode: normalizeCurrencyCode(p.primaryCurrencyCode),
  };
}
