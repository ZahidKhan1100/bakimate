import { api } from "@/lib/api";

export type VoiceLedgerParseConfidence = "high" | "medium" | "low";

export type VoiceLedgerParseResponse = {
  type: "credit" | "payment" | null;
  amount_sen: number | null;
  note: string | null;
  next_due_at: string | null;
  item_key: string | null;
  confidence: VoiceLedgerParseConfidence;
  summary: string | null;
  error_code: string | null;
};

export type VoiceLedgerParseRequest = {
  transcript: string;
  intent_hint: "credit" | "payment";
  currency_code: string;
  customer_name: string;
  quick_items?: string[];
  app_language?: string;
};

export async function parseVoiceLedger(
  body: VoiceLedgerParseRequest,
  signal?: AbortSignal,
): Promise<VoiceLedgerParseResponse> {
  const { data } = await api.post<VoiceLedgerParseResponse>("/voice-ledger-parse", body, {
    signal,
  });
  return data;
}
