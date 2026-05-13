/* eslint-disable react-compiler/react-compiler */
"use no memo";

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import { create } from "zustand";

const STORAGE_KEY = "bakimate-customer-photos-v1";

const PHOTO_DIR = `${FileSystem.documentDirectory ?? ""}customer-photos/`;

type PhotoMap = Record<string, string>;

type Store = {
  hydrated: boolean;
  photos: PhotoMap;
  hydrate: () => Promise<void>;
  set: (id: number, uri: string) => void;
  clear: (id: number) => void;
};

const store = create<Store>((set, get) => ({
  hydrated: false,
  photos: {},
  hydrate: async () => {
    if (get().hydrated) return;
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const parsed: PhotoMap = raw ? JSON.parse(raw) : {};
      set({ photos: parsed, hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },
  set: (id, uri) => {
    const next = { ...get().photos, [String(id)]: uri };
    set({ photos: next });
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  },
  clear: (id) => {
    const next = { ...get().photos };
    delete next[String(id)];
    set({ photos: next });
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  },
}));

// Kick off hydration once on first import (fire-and-forget). The hook below
// just subscribes; no useEffect plumbing is needed which keeps it stable
// against React Compiler memo transforms.
void store.getState().hydrate();

async function ensurePhotoDir(): Promise<void> {
  try {
    const info = await FileSystem.getInfoAsync(PHOTO_DIR);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(PHOTO_DIR, { intermediates: true });
    }
  } catch {
    // best-effort; copy below will surface the real error
  }
}

/** Returns the local URI for a customer's photo, or null if none set. */
export function useCustomerPhoto(customerId: number | null | undefined): string | null {
  const key = customerId == null ? null : String(customerId);
  // Single, derived-value selector: re-renders only when this customer's URI
  // changes, and never touches a deps array (which avoids the React Compiler
  // edge case we hit with split selectors + useEffect).
  return store((s) => (key == null ? null : (s.photos[key] ?? null)));
}

/**
 * Copies the picked image into the app's documents directory so we keep the
 * file even after the system clears the picker cache, then records the URI.
 */
export async function setCustomerPhoto(customerId: number, sourceUri: string): Promise<string> {
  await ensurePhotoDir();
  const ext = (() => {
    const m = sourceUri.match(/\.([a-zA-Z0-9]+)(?:\?|#|$)/);
    return m ? m[1].toLowerCase() : "jpg";
  })();
  const target = `${PHOTO_DIR}${customerId}-${Date.now()}.${ext}`;
  try {
    await FileSystem.copyAsync({ from: sourceUri, to: target });
  } catch {
    store.getState().set(customerId, sourceUri);
    return sourceUri;
  }
  store.getState().set(customerId, target);
  return target;
}

export async function clearCustomerPhoto(customerId: number): Promise<void> {
  const current = store.getState().photos[String(customerId)];
  store.getState().clear(customerId);
  if (current && current.startsWith(PHOTO_DIR)) {
    try {
      await FileSystem.deleteAsync(current, { idempotent: true });
    } catch {
      // ignore
    }
  }
}
