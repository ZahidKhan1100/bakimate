import { api } from "@/lib/api";
import { getDeviceIanaTimezone } from "@/lib/device-timezone";

export type ReportSummaryPriorityCustomer = {
  id: number;
  name: string;
  phone: string | null;
  balance_sen: number;
  next_due_at: string | null;
  days_overdue: number | null;
  days_since_last_payment: number | null;
  risk_score: number;
};

export type Bakiscore = {
  score: number;
  tier: "strong" | "watch" | "at_risk";
  label: string;
  avg_risk: number;
};

export type ReportSummary = {
  total_outstanding_sen: number;
  today: {
    payments_collected_sen: number;
  };
  week: {
    payments_collected_sen: number;
  };
  month: {
    payments_collected_sen: number;
    credit_given_sen: number;
  };
  priority_customers: ReportSummaryPriorityCustomer[];
  bakiscore?: Bakiscore;
  generated_at: string;
};

export async function fetchReportSummary(): Promise<ReportSummary> {
  const { data } = await api.get<ReportSummary>("/reports/summary");

  return data;
}

export type InsightsTopDebtor = {
  id: number;
  name: string;
  phone: string | null;
  balance_sen: number;
};

export type InsightsWeekCashflowDay = {
  date: string;
  label: string;
  payments_collected_sen: number;
  credit_given_sen: number;
};

export type InsightsProjection = {
  next_week_expected_collect_sen: number;
  basis: string;
};

export type InsightsWeeklyNudgeCustomer = {
  id: number;
  name: string;
  phone: string | null;
  balance_sen: number;
  last_payment_at: string | null;
  days_since_payment: number | null;
};

export type InsightsCreditCategoryRow = {
  item_key: string;
  credit_given_sen: number;
};

/** Quick-item + estimated share of udhaar (proportional to lifetime tagged credits per debtor). */
export type InsightsCreditItemPulseRow = {
  item_key: string;
  credit_given_month_sen: number;
  estimated_udhaar_outstanding_sen: number;
};

export type BusinessPulseTopLoyalist = {
  customer_id: number;
  name: string;
  installment_count: number;
  total_payment_sen: number;
};

export type InsightsBusinessPulse = {
  dead_money_sen: number;
  dead_money_days_stale: number;
  this_week_payments_collected_sen: number;
  last_week_payments_collected_sen: number;
  collection_velocity_pct: number | null;
  top_loyalists: BusinessPulseTopLoyalist[];
};

export type InsightsPayload = {
  top_debtors: InsightsTopDebtor[];
  week_cashflow: InsightsWeekCashflowDay[];
  projection: InsightsProjection;
  weekly_nudges: InsightsWeeklyNudgeCustomer[];
  credit_by_category: InsightsCreditCategoryRow[];
  /** Enriched rows for inventory / udhaar story (see credit_by_category for backwards compat). */
  credit_item_pulse?: InsightsCreditItemPulseRow[];
  credit_item_pulse_method?: string;
  month_payments_collected_sen?: number;
  business_pulse?: InsightsBusinessPulse;
  generated_at: string;
};

export async function fetchInsights(): Promise<InsightsPayload> {
  const { data } = await api.get<InsightsPayload>("/reports/insights", {
    params: { timezone: getDeviceIanaTimezone() },
  });

  return data;
}
