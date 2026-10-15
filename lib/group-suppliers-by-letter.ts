import type { Supplier } from "@/lib/api-types";
import { groupByNameLetter, type PersonSection } from "@/lib/person-list-utils";

export type SupplierSection = PersonSection<Supplier>;

export function groupSuppliersByLetter(suppliers: Supplier[]): SupplierSection[] {
  return groupByNameLetter(suppliers);
}
