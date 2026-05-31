import type { Customer } from "@/lib/api-types";

/** Client-side filter for the customers tab (name + phone digits). */
export function filterCustomers(customers: Customer[], query: string): Customer[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return customers;
  }

  const digits = q.replace(/\D/g, "");

  return customers.filter((c) => {
    const name = c.name.toLowerCase();
    if (name.includes(q)) {
      return true;
    }
    const phone = (c.phone ?? "").replace(/\D/g, "");
    if (digits.length >= 2 && phone.includes(digits)) {
      return true;
    }
    return false;
  });
}
