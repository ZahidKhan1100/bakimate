import type { Supplier } from "@/lib/api-types";
import { filterByNameAndPhone } from "@/lib/person-list-utils";

export function filterSuppliers(suppliers: Supplier[], query: string): Supplier[] {
  return filterByNameAndPhone(suppliers, query);
}
