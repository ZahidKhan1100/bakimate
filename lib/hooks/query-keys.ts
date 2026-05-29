export const Qk = {
  customers: ["customers"] as const,
  customersPage: (page: number) => ["customers", page] as const,
  customer: (id: number) => ["customer", id] as const,
  suppliersPage: (page: number) => ["suppliers", page] as const,
  supplier: (id: number) => ["supplier", id] as const,
  insights: ["insights"] as const,
  reportSummary: ["report-summary"] as const,
  outboxPending: ["outbox", "pending"] as const,
  outboxCustomersPending: ["outbox", "customers", "pending"] as const,
  outboxCustomer: (id: number) => ["outbox", "customer", id] as const,
  premiumRecordingAccess: ["premium-recording-access"] as const,
  shopProfile: ["shop-profile"] as const,
};
