import type { Customer } from "@/lib/api-types";
import { groupByNameLetter, type PersonSection } from "@/lib/person-list-utils";

export type CustomerSection = PersonSection<Customer>;

/** Sort customers A–Z and group for a contacts-style section list. */
export function groupCustomersByLetter(customers: Customer[]): CustomerSection[] {
  return groupByNameLetter(customers);
}
