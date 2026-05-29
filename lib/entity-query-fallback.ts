import type { QueryClient } from "@tanstack/react-query";

import type { Customer, LaravelPaginator, Supplier } from "@/lib/api-types";
import { Qk } from "@/lib/hooks/query-keys";

/** Detail row if we have ever loaded this customer, or a row from any cached customers list page. */
export function pickCustomerFromQueryCaches(queryClient: QueryClient, customerId: number): Customer | undefined {
  const direct = queryClient.getQueryData<Customer>(Qk.customer(customerId));
  if (direct) {
    return direct;
  }

  const pages = queryClient.getQueriesData<LaravelPaginator<Customer>>({
    queryKey: Qk.customers,
    exact: false,
  });

  for (const [, paginator] of pages) {
    const row = paginator?.data?.find((c) => c.id === customerId);
    if (row) {
      return row;
    }
  }

  return undefined;
}

export function pickSupplierFromQueryCaches(queryClient: QueryClient, supplierId: number): Supplier | undefined {
  const direct = queryClient.getQueryData<Supplier>(Qk.supplier(supplierId));
  if (direct) {
    return direct;
  }

  const pages = queryClient.getQueriesData<LaravelPaginator<Supplier>>({
    queryKey: ["suppliers"],
    exact: false,
  });

  for (const [, paginator] of pages) {
    const row = paginator?.data?.find((s) => s.id === supplierId);
    if (row) {
      return row;
    }
  }

  return undefined;
}
