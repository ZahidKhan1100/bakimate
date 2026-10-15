import type { Customer } from "@/lib/api-types";
import { filterByNameAndPhone } from "@/lib/person-list-utils";

/** Client-side filter for the customers tab (name + phone digits). */
export function filterCustomers(customers: Customer[], query: string): Customer[] {
  return filterByNameAndPhone(customers, query);
}
