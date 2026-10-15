import type { Customer } from "@/lib/api-types";
import { phoneDigitsOnly } from "@/lib/phone-digits";

const MIN_DIGITS_FOR_DUPLICATE_CHECK = 8;

/** Another customer in the shop with the same phone digits (optional exclude for edit). */
export function findCustomerByPhoneDigits(
  customers: Customer[],
  phone: string,
  exceptCustomerId?: number,
): Customer | undefined {
  const target = phoneDigitsOnly(phone);
  if (target.length < MIN_DIGITS_FOR_DUPLICATE_CHECK) {
    return undefined;
  }
  return customers.find((c) => {
    if (exceptCustomerId != null && c.id === exceptCustomerId) {
      return false;
    }
    const digits = phoneDigitsOnly(c.phone);
    return digits.length >= MIN_DIGITS_FOR_DUPLICATE_CHECK && digits === target;
  });
}
