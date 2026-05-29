import type { QueryClient } from "@tanstack/react-query";

import type { Customer } from "@/lib/api-types";
import { Qk } from "@/lib/hooks/query-keys";
import type { ReportSummary, ReportSummaryPriorityCustomer } from "@/lib/reports-api";

type CustomersPage = { data?: Customer[] };

/** Rebuild a minimal home summary from persisted customer list pages when `/reports/summary` is unavailable. */
export function pickReportSummaryFromCustomerCaches(qc: QueryClient): ReportSummary | undefined {
  const cached = qc.getQueryData<ReportSummary>(Qk.reportSummary);
  if (cached) {
    return cached;
  }

  const pages = qc.getQueriesData<CustomersPage>({ queryKey: Qk.customers });
  const byId = new Map<number, Customer>();
  for (const [, page] of pages) {
    for (const row of page?.data ?? []) {
      byId.set(row.id, row);
    }
  }
  if (byId.size === 0) {
    return undefined;
  }

  const customers = [...byId.values()];
  const withDebt = customers.filter((c) => c.balance_sen > 0);
  const totalOutstanding = withDebt.reduce((sum, c) => sum + c.balance_sen, 0);

  const priority: ReportSummaryPriorityCustomer[] = [...withDebt]
    .sort((a, b) => b.balance_sen - a.balance_sen)
    .slice(0, 8)
    .map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      balance_sen: c.balance_sen,
      next_due_at: c.next_due_at ?? null,
      days_overdue: null,
      days_since_last_payment: null,
      risk_score: 0,
    }));

  return {
    total_outstanding_sen: totalOutstanding,
    today: { payments_collected_sen: 0 },
    week: { payments_collected_sen: 0 },
    month: { payments_collected_sen: 0, credit_given_sen: 0 },
    priority_customers: priority,
    bakiscore: {
      score: 100,
      tier: "strong",
      label: "",
      avg_risk: 0,
    },
    generated_at: new Date(0).toISOString(),
  };
}
