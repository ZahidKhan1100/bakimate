/** Laravel paginator JSON shape (subset). */
export type LaravelPaginator<T> = {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  first_page_url?: string;
  next_page_url?: string | null;
  prev_page_url?: string | null;
};

export type CustomerPromise = {
  id: number;
  customer_id: number;
  amount_sen: number;
  promised_date: string;
  status: "pending" | "kept" | "missed" | "cancelled";
  note: string | null;
  resolved_at?: string | null;
  updated_at?: string | null;
};

/** Row returned from `POST /transactions` (subset). */
export type TransactionCreated = {
  id: number;
  shop_id: number;
  customer_id: number;
  amount_sen: number;
  type: "credit" | "payment";
  note: string | null;
  item_key?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

/** Ledger line from `GET /customers/{id}` (subset). */
export type CustomerLedgerTransactionApi = {
  id: number;
  amount_sen: number;
  type: "credit" | "payment";
  note: string | null;
  item_key?: string | null;
  created_at: string | null;
};

export type Customer = {
  id: number;
  shop_id: number;
  name: string;
  phone: string | null;
  balance_sen: number;
  /** ISO date only (YYYY-MM-DD) when set — next installment reminder. */
  next_due_at?: string | null;
  /** Total Qist goal in sen — optional instalment planner. */
  goal_amount_sen?: number | null;
  goal_target_date?: string | null;
  /** One star per settled promise (“kept” from pending). Tracked server-side. */
  reliability_stars?: number;
  /** Promise-to-pay entries (included on GET /customers/{id} only when present). */
  promises?: CustomerPromise[];
  /** Latest movements (credit / payment), newest first — from `GET /customers/{id}`. */
  recent_transactions?: CustomerLedgerTransactionApi[];
  created_at?: string;
  updated_at?: string;
};

/** Supplier / payables — positive balance_sen means the shop owes the supplier. */
export type Supplier = {
  id: number;
  shop_id: number;
  name: string;
  phone: string | null;
  balance_sen: number;
  created_at?: string;
  updated_at?: string;
};

/** Row returned from `POST /supplier-transactions`. */
export type SupplierTransactionCreated = {
  id: number;
  shop_id: number;
  supplier_id: number;
  amount_sen: number;
  type: "purchase" | "payment_out";
  note: string | null;
};

export type SupplierLedgerTransactionApi = {
  id: number;
  amount_sen: number;
  type: "purchase" | "payment_out";
  note: string | null;
  created_at: string | null;
};

export type SupplierDetail = Supplier & {
  recent_transactions: SupplierLedgerTransactionApi[];
};

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  /** ISO 8601 when the server has confirmed the address (null until verified). */
  email_verified_at?: string | null;
};

export type AuthResponse = {
  /** Omitted or null until the account is allowed to use the API (e.g. after email verification). */
  token?: string | null;
  user: AuthUser;
  /** First shop for this account (BakiMate single-shop model). */
  shop?: ShopApi | null;
  /** True right after email/password registration before the inbox link is used. */
  verification_required?: boolean;
  message?: string;
};

export type CheckEmailVerifiedResponse =
  | { email_verified: false }
  | AuthResponse;

export type ShopApi = {
  id: number;
  name: string;
  /** ISO 4217-style code stored on server (balances are expressed in minor units of this currency). */
  primary_currency_code?: string | null;
  location: string | null;
  contact: string | null;
  payment_instructions: string | null;
  credit_quick_items: string[];
  reference_currency_code: string | null;
  reference_currency_per_myr: number | null;
  /** Whether `subscription_expires_at` is in the future on the server. */
  subscription_active?: boolean;
  /** ISO datetime when server-side premium lapses (`null` if never set). */
  subscription_expires_at?: string | null;
  /** Public URL for stored DuitNow QR image (`null` if not uploaded). */
  duitnow_qr_url?: string | null;
};

/** Local shop form fields (cached per user + synced with API). */
export type ShopProfile = {
  shopName: string;
  /** Bookkeeping / display currency (ISO alpha-3, e.g. MYR, PKR, SGD). */
  primaryCurrencyCode: string;
  shopLocation: string;
  shopContact: string;
  /** DuitNow / bank details — included in automated nudge WhatsApp. */
  paymentInstructions: string;
  /** One quick-item label per line (inventory-led credit tagging). */
  quickItemsLines: string;
  referenceCurrencyCode: string;
  /** Foreign units per 1 MYR (e.g. 73.5 PKR per RM1). */
  referenceCurrencyPerMyrText: string;
  /** Cached from server; not edited locally. */
  duitnowQrUrl?: string | null;
};
