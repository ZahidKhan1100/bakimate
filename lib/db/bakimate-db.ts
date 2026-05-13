import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SQLiteDatabase } from "expo-sqlite";
import { Platform } from "react-native";

const LEGACY_ASYNC_OUTBOX_KEY = "BAKIMATE_TX_OUTBOX_V1";

let dbPromise: Promise<SQLiteDatabase> | null = null;

export async function openBakimateDatabase(): Promise<SQLiteDatabase | null> {
  if (Platform.OS === "web") {
    return null;
  }

  if (!dbPromise) {
    dbPromise = (async () => {
      const { openDatabaseAsync } = await import("expo-sqlite");
      const db = await openDatabaseAsync("bakimate.db");
      await db.execAsync(`
        PRAGMA journal_mode=WAL;
        CREATE TABLE IF NOT EXISTS outbox_transactions (
          id TEXT PRIMARY KEY NOT NULL,
          payload TEXT NOT NULL,
          created_at TEXT NOT NULL,
          attempts INTEGER NOT NULL DEFAULT 0,
          last_error TEXT,
          superseded INTEGER NOT NULL DEFAULT 0,
          superseded_reason TEXT,
          superseded_at TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_outbox_active_created ON outbox_transactions (created_at)
          WHERE superseded = 0;
      `);

      await migrateLegacyAsyncStorageOutbox(db);

      return db;
    })();
  }

  return dbPromise;
}

/**
 * One-time import from AsyncStorage queue (SQLite primary on native).
 */
async function migrateLegacyAsyncStorageOutbox(db: SQLiteDatabase): Promise<void> {
  const marker = "__BAKIMATE_OUTBOX_ASYNC_MIGRATED_V2__";
  const already = await AsyncStorage.getItem(marker);
  if (already === "1") {
    return;
  }

  const raw = await AsyncStorage.getItem(LEGACY_ASYNC_OUTBOX_KEY);

  if (!raw) {
    await AsyncStorage.setItem(marker, "1");
    return;
  }

  try {
    const parsed = JSON.parse(raw) as { id?: string; payload?: unknown; created_at?: string }[];

    if (!Array.isArray(parsed)) {
      await AsyncStorage.setItem(marker, "1");

      return;
    }

    for (const row of parsed) {
      if (!row?.id || !row.created_at || !row.payload) {
        continue;
      }

      await db.runAsync(
        `INSERT OR IGNORE INTO outbox_transactions (id, payload, created_at, attempts, superseded)
         VALUES (?, ?, ?, 0, 0)`,
        row.id,
        JSON.stringify(row.payload),
        row.created_at,
      );
    }
    await AsyncStorage.removeItem(LEGACY_ASYNC_OUTBOX_KEY);
  } finally {
    await AsyncStorage.setItem(marker, "1");
  }
}
