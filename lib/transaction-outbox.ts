import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import * as Crypto from "expo-crypto";

import { api } from "@/lib/api";
import type { Customer } from "@/lib/api-types";
import { openBakimateDatabase } from "@/lib/db/bakimate-db";
import { Qk } from "@/lib/hooks/query-keys";
import { queryClient } from "@/lib/query-client";

const WEB_FALLBACK_STORAGE_KEY = "BAKIMATE_TX_OUTBOX_WEB_V3";

export type OutboxTransactionPayload = {
  customer_id: number;
  amount_sen: number;
  type: "credit" | "payment";
  note?: string | null;
  next_due_at?: string | null;
  item_key?: string | null;
  goal_amount_sen?: number | null;
  goal_target_date?: string | null;
};

export type OutboxEntry = {
  id: string;
  payload: OutboxTransactionPayload;
  created_at: string;
};

export type RecordTransactionApiResponse = {
  success: boolean;
  transaction: unknown;
  customer: Customer;
};

async function invalidateOutboxUi(customerId?: number): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: Qk.outboxPending });
  if (customerId !== undefined) {
    await queryClient.invalidateQueries({ queryKey: Qk.outboxCustomer(customerId) });
  }
}

function summarizeAxios(e: unknown): string {
  if (axios.isAxiosError(e)) {
    const m = e.response?.data &&
      typeof e.response.data === "object" &&
      "message" in e.response.data
      ? JSON.stringify(e.response.data)
      : e.message;

    return String(m ?? "request failed");
  }
  return String(e);
}

/**
 * Tombstone only hard billing blocks. Do **not** supersede 422 (e.g. customer_id not synced yet) or 403
 * (subscription may renew after offline queue).
 */
function shouldSupersede(e: unknown): boolean {
  if (!axios.isAxiosError(e)) {
    return false;
  }

  return e.response?.status === 402;
}

function isSubscriptionBlockedError(e: unknown): boolean {
  if (!axios.isAxiosError(e)) {
    return false;
  }

  if (e.response?.status !== 403) {
    return false;
  }

  const data = e.response.data;
  const msg =
    typeof data === "object" && data !== null && "message" in data
      ? String((data as { message?: unknown }).message)
      : "";

  return /subscription/i.test(msg);
}

/** Recoverable failures (timeouts, offline, server errors). */

function looksRetryable(e: unknown): boolean {
  return !shouldSupersede(e);
}

/** --- Web / AsyncStorage queue (SQLite unavailable) --- */

async function readWebOutbox(): Promise<OutboxEntry[]> {
  const raw = await AsyncStorage.getItem(WEB_FALLBACK_STORAGE_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as OutboxEntry[];

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeWebOutbox(entries: OutboxEntry[]): Promise<void> {
  await AsyncStorage.setItem(WEB_FALLBACK_STORAGE_KEY, JSON.stringify(entries));
}

export async function enqueueTransaction(payload: OutboxTransactionPayload): Promise<OutboxEntry> {
  const entry: OutboxEntry = {
    id: Crypto.randomUUID(),
    payload,
    created_at: new Date().toISOString(),
  };

  const db = await openBakimateDatabase();

  if (db) {
    await db.runAsync(
      `INSERT INTO outbox_transactions (id, payload, created_at, attempts, superseded)
       VALUES (?, ?, ?, 0, 0)`,
      entry.id,
      JSON.stringify(entry.payload),
      entry.created_at,
    );
    await invalidateOutboxUi(payload.customer_id);
    return entry;
  }

  const entries = await readWebOutbox();
  entries.push(entry);
  await writeWebOutbox(entries);
  await invalidateOutboxUi(payload.customer_id);
  return entry;
}

export async function outboxLength(): Promise<number> {
  const db = await openBakimateDatabase();
  if (db) {
    type Row = { c: number };
    const r = await db.getFirstAsync<Row>(
      `SELECT COUNT(*) AS c FROM outbox_transactions WHERE superseded = 0`,
    );

    return r?.c ?? 0;
  }
  const entries = await readWebOutbox();

  return entries.length;
}

export type OutboxSyncSummary = {
  pending: number;
  /** First non-superseded row's last_error (flush failures). */
  firstError: string | null;
  subscriptionBlocked: boolean;
};

export async function getOutboxSyncSummary(): Promise<OutboxSyncSummary> {
  const db = await openBakimateDatabase();
  if (db) {
    type CountRow = { c: number };
    type ErrRow = { last_error: string | null };
    const countRow = await db.getFirstAsync<CountRow>(
      `SELECT COUNT(*) AS c FROM outbox_transactions WHERE superseded = 0`,
    );
    const errRow = await db.getFirstAsync<ErrRow>(
      `SELECT last_error FROM outbox_transactions WHERE superseded = 0 AND last_error IS NOT NULL
       ORDER BY created_at ASC LIMIT 1`,
    );
    const err = errRow?.last_error ?? null;
    return {
      pending: countRow?.c ?? 0,
      firstError: err,
      subscriptionBlocked: Boolean(err && /subscription/i.test(err)),
    };
  }

  const entries = await readWebOutbox();
  return {
    pending: entries.length,
    firstError: null,
    subscriptionBlocked: false,
  };
}

export async function pendingCountForCustomer(customerId: number): Promise<number> {
  const db = await openBakimateDatabase();
  if (db) {
    type Row = { c: number };
    const r = await db.getFirstAsync<Row>(
      `SELECT COUNT(*) AS c FROM outbox_transactions
       WHERE superseded = 0 AND json_extract(payload, '$.customer_id') = ?`,
      customerId,
    );

    return r?.c ?? 0;
  }
  let n = 0;
  const entries = await readWebOutbox();
  for (const e of entries) {
    if (e.payload.customer_id === customerId) {
      n++;
    }
  }

  return n;
}

async function supersedeSQLiteRow(db: NonNullable<Awaited<ReturnType<typeof openBakimateDatabase>>>, id: string, reason: string): Promise<void> {
  await db.runAsync(
    `UPDATE outbox_transactions
     SET superseded = 1, superseded_reason = ?, superseded_at = ?
     WHERE id = ?`,
    reason.slice(0, 2000),
    new Date().toISOString(),
    id,
  );
}

async function bumpAttemptSQLite(db: NonNullable<Awaited<ReturnType<typeof openBakimateDatabase>>>, id: string, err: string): Promise<void> {
  await db.runAsync(
    `UPDATE outbox_transactions
     SET attempts = attempts + 1, last_error = ?
     WHERE id = ?`,
    err.slice(0, 2000),
    id,
  );
}

/** Serialize outbox delivery so SQLite is never used concurrently (NetInfo + mount races). */
let outboxFlushChain: Promise<void> = Promise.resolve();

/**
 * Deliver queued POSTs in creation order. Successful rows are deleted.
 * Superseded (tombstoned) when API returns 402/403/422 — no infinite retry.
 * Network / 5xx bump `attempts` and keep the row.
 */
export async function flushTransactionOutbox(): Promise<{
  sent: number;
  failed: number;
  superseded: number;
}> {
  const previous = outboxFlushChain;
  let release!: () => void;
  outboxFlushChain = new Promise<void>((resolve) => {
    release = resolve;
  });
  await previous;
  try {
    return await flushTransactionOutboxImpl();
  } finally {
    release();
  }
}

async function flushTransactionOutboxImpl(): Promise<{
  sent: number;
  failed: number;
  superseded: number;
}> {
  const db = await openBakimateDatabase();

  if (db) {
    type Row = { id: string; payload: string };

    let sent = 0;
    let failed = 0;
    let superseded = 0;

    const rows = await db.getAllAsync<Row>(
      `SELECT id, payload FROM outbox_transactions WHERE superseded = 0 ORDER BY created_at ASC`,
    );

    const touchedCustomers = new Set<number>();

    for (const row of rows) {
      let payload: OutboxTransactionPayload;
      try {
        payload = JSON.parse(row.payload) as OutboxTransactionPayload;
      } catch {
        await supersedeSQLiteRow(db, row.id, "corrupt payload");
        superseded++;

        continue;
      }

      if (!Number.isFinite(payload.customer_id) || payload.customer_id < 1) {
        const msg = `waiting for customer ${payload.customer_id} to sync`;
        await bumpAttemptSQLite(db, row.id, msg);
        failed++;
        touchedCustomers.add(payload.customer_id);
        continue;
      }

      try {
        await api.post<RecordTransactionApiResponse>("/transactions", payload, {
          headers: { "X-Bakimate-Offline-Sync": "1" },
        });
        await db.runAsync(`DELETE FROM outbox_transactions WHERE id = ?`, row.id);
        sent++;
        touchedCustomers.add(payload.customer_id);
      } catch (e) {
        if (axios.isAxiosError(e) && e.response?.status === 401) {
          failed++;
          break;
        }

        if (shouldSupersede(e)) {
          await supersedeSQLiteRow(db, row.id, summarizeAxios(e));
          superseded++;
          touchedCustomers.add(payload.customer_id);
        } else if (isSubscriptionBlockedError(e)) {
          await bumpAttemptSQLite(db, row.id, summarizeAxios(e));
          failed++;
          touchedCustomers.add(payload.customer_id);
        } else if (looksRetryable(e)) {
          await bumpAttemptSQLite(db, row.id, summarizeAxios(e));
          failed++;
          touchedCustomers.add(payload.customer_id);
        } else {
          await supersedeSQLiteRow(db, row.id, summarizeAxios(e));
          superseded++;
          touchedCustomers.add(payload.customer_id);
        }
      }
    }

    for (const id of touchedCustomers) {
      await invalidateOutboxUi(id);
    }

    await invalidateOutboxUi();

    return { sent, failed, superseded };
  }

  let sent = 0;
  let failed = 0;
  let superseded = 0;

  const entries = await readWebOutbox();
  const remaining: OutboxEntry[] = [];
  const touched = new Set<number>();

  for (let i = 0; i < entries.length; i++) {
    const row = entries[i];
    if (!Number.isFinite(row.payload.customer_id) || row.payload.customer_id < 1) {
      remaining.push(row);
      failed++;
      touched.add(row.payload.customer_id);
      continue;
    }
    try {
      await api.post<RecordTransactionApiResponse>("/transactions", row.payload, {
        headers: { "X-Bakimate-Offline-Sync": "1" },
      });
      sent++;
      touched.add(row.payload.customer_id);
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 401) {
        remaining.push(...entries.slice(i));
        failed++;
        break;
      }

      if (shouldSupersede(e)) {
        superseded++;
        touched.add(row.payload.customer_id);
      } else {
        remaining.push(row);
        failed++;
        touched.add(row.payload.customer_id);
      }
    }
  }

  await writeWebOutbox(remaining);

  for (const id of touched) {
    await invalidateOutboxUi(id);
  }
  await invalidateOutboxUi();

  return { sent, failed, superseded };
}
