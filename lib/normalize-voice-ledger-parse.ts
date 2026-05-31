import type { VoiceLedgerParseResponse } from "@/lib/voice-ledger-parse-api";

const PAYMENT_KEYWORDS =
  /\b(wusool|wasool|received|payment|paid|bayar|terima|liya|mila|got paid|cash in|collect)\b/i;

const ROMAN_SAU = /\b(?:teen|3)\s*sau\b|\bteen\s*sau\b/i;
const ROMAN_SAU_GENERIC = /\b(\d{1,4})\s*sau\b/i;

/** Best-effort amount from STT when Gemini omits amount_sen (payment utterances). */
export function extractVoiceAmountSenFromTranscript(
  transcript: string,
  currencyCode: string,
): number | null {
  const t = transcript.trim();
  if (!t) {
    return null;
  }

  if (ROMAN_SAU.test(t)) {
    return 30000;
  }

  const sauMatch = t.match(ROMAN_SAU_GENERIC);
  if (sauMatch) {
    const hundreds = Number.parseInt(sauMatch[1] ?? "", 10);
    if (Number.isFinite(hundreds) && hundreds > 0 && hundreds < 10_000) {
      return hundreds * 10000;
    }
  }

  const decimal = t.match(/(\d{1,7}(?:[.,]\d{1,2})?)/);
  if (decimal) {
    const major = Number.parseFloat((decimal[1] ?? "").replace(",", "."));
    if (Number.isFinite(major) && major > 0) {
      return majorToSen(major, currencyCode);
    }
  }

  return null;
}

function majorToSen(major: number, currencyCode: string): number {
  const code = currencyCode.trim().toUpperCase();
  if (code === "JPY" || code === "KRW") {
    return Math.round(major);
  }
  return Math.round(major * 100);
}

export function transcriptLooksLikePayment(transcript: string): boolean {
  return PAYMENT_KEYWORDS.test(transcript);
}

/** Align parse result with the open sheet (credit vs got paid). */
export function normalizeVoiceLedgerParse(
  parsed: VoiceLedgerParseResponse,
  intentHint: "credit" | "payment",
  transcript: string,
  currencyCode: string,
): VoiceLedgerParseResponse {
  let amount_sen = parsed.amount_sen;
  let confidence = parsed.confidence;
  let type = parsed.type;
  let item_key = parsed.item_key;
  let next_due_at = parsed.next_due_at;
  let note = parsed.note;

  if (intentHint === "payment") {
    type = "payment";
    item_key = null;
    next_due_at = null;

    if (amount_sen == null || amount_sen <= 0) {
      amount_sen = extractVoiceAmountSenFromTranscript(transcript, currencyCode);
    }

    if (
      amount_sen != null &&
      amount_sen > 0 &&
      confidence === "low" &&
      (transcriptLooksLikePayment(transcript) || transcript.trim().length > 0)
    ) {
      confidence = "medium";
    }
  } else if (type !== "credit" && type !== "payment") {
    type = "credit";
  }

  return {
    ...parsed,
    type,
    amount_sen,
    item_key,
    next_due_at,
    note,
    confidence,
  };
}

export function isVoiceParseAcceptable(
  parsed: VoiceLedgerParseResponse,
  intentHint: "credit" | "payment",
): boolean {
  if (parsed.amount_sen == null || parsed.amount_sen <= 0) {
    return false;
  }
  if (intentHint === "payment") {
    return parsed.confidence !== "low";
  }
  return parsed.confidence !== "low";
}
