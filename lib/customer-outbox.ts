import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import * as Crypto from "expo-crypto";

import type { Customer, LaravelPaginator } from "@/lib/api-types";
import { createCustomer } from "@/lib/customers-api";
import { remapCustomerPhoto } from "@/lib/customer-photos";
import { openBakimateDatabase } from "@/lib/db/bakimate-db";
import { Qk } from "@/lib/hooks/query-keys";
import { queryClient } from "@/lib/query-client";
import { flushTransactionOutbox } from "@/lib/transaction-outbox";

const WEB_OUTBOX_KEY = "BAKIMATE_CUSTOMER_OUTBOX_WEB_V1";

export type OutboxCustomerPayload = {
  /** Negative local id until POST /customers succeeds. */
  local_id: number;
  name: string;
  phone: string | null;
};

export type OutboxCustomerEntry = {
  id: string;
  payload: OutboxCustomerPayload;
  created_at: string;
};

function summarizeAxios(e: unknown): string {
  if (axios.isAxiosError(e)) {
    const m =
      e.response?.data &&
      typeof e.response.data === "object" &&
      "message" in e.response.data
        ? JSON.stringify(e.response.data)
        : e.message;

    return String(m ?? "request failed");
  }
  return String(e);
}

function shouldSupersede(e: unknown): boolean {
  if (!axios.isAxiosError(e)) {
    return false;
  }

  return e.response?.status === 402;
}

function looksRetryable(e: unknown): boolean {
  return !shouldSupersede(e);
}

function optimisticCustomer(payload: OutboxCustomerPayload): Customer {
  const now = new Date().toISOString();

  return {
    id: payload.local_id,
    shop_id: 0,
    name: payload.name,
    phone: payload.phone,
    balance_sen: 0,
    created_at: now,
    updated_at: now,
  };
}

async function allocateLocalCustomerId(): Promise<number> {
  const pending = await listPendingCustomerPayloads();
  const used = new Set(pending.map((p) => p.local_id));
  let id = -1;
  while (used.has(id)) {
    id -= 1;
  }

  return id;
}

async function readWebOutbox(): Promise<OutboxCustomerEntry[]> {
  const raw = await AsyncStorage.getItem(WEB_OUTBOX_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as OutboxCustomerEntry[];

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeWebOutbox(entries: OutboxCustomerEntry[]): Promise<void> {
  await AsyncStorage.setItem(WEB_OUTBOX_KEY, JSON.stringify(entries));
}

export async function listPendingCustomerPayloads(): Promise<OutboxCustomerPayload[]> {
  const db = await openBakimateDatabase();
  if (db) {
    type Row = { payload: string };
    const rows = await db.getAllAsync<Row>(
      `SELECT payload FROM outbox_customers WHERE superseded = 0 ORDER BY created_at ASC`,
    );
    const out: OutboxCustomerPayload[] = [];
    for (const row of rows) {
      try {
        out.push(JSON.parse(row.payload) as OutboxCustomerPayload);
      } catch {
        /** skip corrupt */
      }
    }

    return out;
  }

  return (await readWebOutbox()).map((e) => e.payload);
}

export function mergePendingCustomersIntoPage(
  page: LaravelPaginator<Customer> | undefined,
  pending: OutboxCustomerPayload[] = [],
): LaravelPaginator<Customer> | undefined {
  const locals = pending.map(optimisticCustomer).filter((c) => c.id < 0);

  if (locals.length === 0) {
    return page;
  }

  if (!page) {
    return {
      data: locals,
      current_page: 1,
      first_page_url: "",
      from: 1,
      last_page: 1,
      last_page_url: "",
      links: [],
      next_page_url: null,
      path: "",
      per_page: 25,
      prev_page_url: null,
      to: locals.length,
      total: locals.length,
    };
  }

  const serverIds = new Set(page.data.map((c) => c.id));
  const uniqueLocals = locals.filter((c) => !serverIds.has(c.id));

  if (uniqueLocals.length === 0) {
    return page;
  }

  return { ...page, data: [...uniqueLocals, ...page.data] };
}

async function refreshPendingCustomersQuery(): Promise<void> {
  const pending = await listPendingCustomerPayloads();
  queryClient.setQueryData(Qk.outboxCustomersPending, pending);
}

export async function enqueueCustomer(payload: {
  name: string;
  phone?: string | null;
}): Promise<Customer> {
  const local_id = await allocateLocalCustomerId();
  const full: OutboxCustomerPayload = {
    local_id,
    name: payload.name.trim(),
    phone: payload.phone?.trim() ? payload.phone.trim() : null,
  };

  const entry: OutboxCustomerEntry = {
    id: Crypto.randomUUID(),
    payload: full,
    created_at: new Date().toISOString(),
  };

  const db = await openBakimateDatabase();
  if (db) {
    await db.runAsync(
      `INSERT INTO outbox_customers (id, payload, created_at, attempts, superseded)
       VALUES (?, ?, ?, 0, 0)`,
      entry.id,
      JSON.stringify(entry.payload),
      entry.created_at,
    );
  } else {
    const entries = await readWebOutbox();
    entries.push(entry);
    await writeWebOutbox(entries);
  }

  const customer = optimisticCustomer(full);
  queryClient.setQueryData(Qk.customer(customer.id), customer);
  await refreshPendingCustomersQuery();
  await queryClient.invalidateQueries({ queryKey: Qk.customers, exact: false });

  return customer;
}

async function remapTransactionOutboxCustomerIds(
  db: NonNullable<Awaited<ReturnType<typeof openBakimateDatabase>>>,
  fromId: number,
  toId: number,
): Promise<void> {
  type Row = { id: string; payload: string };
  const rows = await db.getAllAsync<Row>(
    `SELECT id, payload FROM outbox_transactions WHERE superseded = 0`,
  );

  for (const row of rows) {
    try {
      const p = JSON.parse(row.payload) as { customer_id?: number };
      if (p.customer_id === fromId) {
        p.customer_id = toId;
        await db.runAsync(`UPDATE outbox_transactions SET payload = ? WHERE id = ?`, JSON.stringify(p), row.id);
      }
    } catch {
      /** skip */
    }
  }
}

async function remapWebTransactionOutboxCustomerIds(fromId: number, toId: number): Promise<void> {
  const raw = await AsyncStorage.getItem("BAKIMATE_TX_OUTBOX_WEB_V3");
  if (!raw) {
    return;
  }
  try {
    const entries = JSON.parse(raw) as { id: string; payload: { customer_id: number } }[];
    if (!Array.isArray(entries)) {
      return;
    }
    let changed = false;
    for (const e of entries) {
      if (e.payload?.customer_id === fromId) {
        e.payload.customer_id = toId;
        changed = true;
      }
    }
    if (changed) {
      await AsyncStorage.setItem("BAKIMATE_TX_OUTBOX_WEB_V3", JSON.stringify(entries));
    }
  } catch {
    /** ignore */
  }
}

let customerFlushChain: Promise<void> = Promise.resolve();

export async function flushCustomerOutbox(): Promise<{
  sent: number;
  failed: number;
  superseded: number;
}> {
  const previous = customerFlushChain;
  let release!: () => void;
  customerFlushChain = new Promise<void>((resolve) => {
    release = resolve;
  });
  await previous;
  try {
    return await flushCustomerOutboxImpl();
  } finally {
    release();
  }
}

async function flushCustomerOutboxImpl(): Promise<{
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
      `SELECT id, payload FROM outbox_customers WHERE superseded = 0 ORDER BY created_at ASC`,
    );

    for (const row of rows) {
      let payload: OutboxCustomerPayload;
      try {
        payload = JSON.parse(row.payload) as OutboxCustomerPayload;
      } catch {
        await db.runAsync(
          `UPDATE outbox_customers SET superseded = 1, superseded_reason = ?, superseded_at = ? WHERE id = ?`,
          "corrupt payload",
          new Date().toISOString(),
          row.id,
        );
        superseded++;

        continue;
      }

      try {
        const remote = await createCustomer({ name: payload.name, phone: payload.phone });
        await remapTransactionOutboxCustomerIds(db, payload.local_id, remote.id);
        await remapCustomerPhoto(payload.local_id, remote.id);
        queryClient.removeQueries({ queryKey: Qk.customer(payload.local_id) });
        queryClient.setQueryData(Qk.customer(remote.id), remote);
        await db.runAsync(`DELETE FROM outbox_customers WHERE id = ?`, row.id);
        sent++;
      } catch (e) {
        if (axios.isAxiosError(e) && e.response?.status === 401) {
          failed++;
          break;
        }
        if (shouldSupersede(e)) {
          await db.runAsync(
            `UPDATE outbox_customers SET superseded = 1, superseded_reason = ?, superseded_at = ? WHERE id = ?`,
            summarizeAxios(e).slice(0, 2000),
            new Date().toISOString(),
            row.id,
          );
          superseded++;
        } else if (looksRetryable(e)) {
          await db.runAsync(
            `UPDATE outbox_customers SET attempts = attempts + 1, last_error = ? WHERE id = ?`,
            summarizeAxios(e).slice(0, 2000),
            row.id,
          );
          failed++;
        } else {
          await db.runAsync(
            `UPDATE outbox_customers SET superseded = 1, superseded_reason = ?, superseded_at = ? WHERE id = ?`,
            summarizeAxios(e).slice(0, 2000),
            new Date().toISOString(),
            row.id,
          );
          superseded++;
        }
      }
    }

    await refreshPendingCustomersQuery();
    await queryClient.invalidateQueries({ queryKey: Qk.customers, exact: false });
    await queryClient.invalidateQueries({ queryKey: Qk.reportSummary });

    return { sent, failed, superseded };
  }

  let sent = 0;
  let failed = 0;
  let superseded = 0;
  const entries = await readWebOutbox();
  const remaining: OutboxCustomerEntry[] = [];

  for (let i = 0; i < entries.length; i++) {
    const row = entries[i];
    try {
      const remote = await createCustomer({ name: row.payload.name, phone: row.payload.phone });
      await remapWebTransactionOutboxCustomerIds(row.payload.local_id, remote.id);
      await remapCustomerPhoto(row.payload.local_id, remote.id);
      queryClient.removeQueries({ queryKey: Qk.customer(row.payload.local_id) });
      queryClient.setQueryData(Qk.customer(remote.id), remote);
      sent++;
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 401) {
        remaining.push(...entries.slice(i));
        failed++;
        break;
      }
      if (shouldSupersede(e)) {
        superseded++;
      } else {
        remaining.push(row);
        failed++;
      }
    }
  }

  await writeWebOutbox(remaining);
  await refreshPendingCustomersQuery();
  await queryClient.invalidateQueries({ queryKey: Qk.customers, exact: false });
  await queryClient.invalidateQueries({ queryKey: Qk.reportSummary });

  return { sent, failed, superseded };
}

/** Flush customers first so queued transactions can reference real server ids. */
export async function flushAllOutboxes(): Promise<{
  customers: { sent: number; failed: number; superseded: number };
  transactions: { sent: number; failed: number; superseded: number };
}> {
  const customers = await flushCustomerOutbox();
  const transactions = await flushTransactionOutbox();

  return { customers, transactions };
}
