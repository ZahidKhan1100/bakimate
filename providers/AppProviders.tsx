import "@/lib/i18n";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import NetInfo from "@react-native-community/netinfo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { defaultShouldDehydrateQuery, type Query } from "@tanstack/query-core";
import { useEffect, useRef } from "react";
import { I18nextProvider } from "react-i18next";
import { AppState, type AppStateStatus, Platform } from "react-native";
import Purchases from "react-native-purchases";

import { setAuthToken } from "@/lib/api";
import { Qk } from "@/lib/hooks/query-keys";
import i18n from "@/lib/i18n";
import { queryClient } from "@/lib/query-client";
import { ensureRevenueCatConfigured } from "@/lib/revenuecat-configure";
import { fetchCustomersPage } from "@/lib/customers-api";
import { fetchReportSummary } from "@/lib/reports-api";
import { fetchShopProfile } from "@/lib/shop-api";
import { flushAllOutboxes } from "@/lib/customer-outbox";
import {
  cancelWeeklyInsightsReminder,
  scheduleWeeklyInsightsReminder,
} from "@/lib/weekly-nudge-notifications";
import { useSessionStore } from "@/stores/session-store";

const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: "BAKIMATE_RQ_CACHE_V1",
});

/** Never persist entitlement checks — restores were stuck with `entitled: false` after buying. */
function shouldDehydrateQueryForPersist(query: Query): boolean {
  if (Array.isArray(query.queryKey) && query.queryKey[0] === Qk.premiumRecordingAccess[0]) {
    return false;
  }

  return defaultShouldDehydrateQuery(query);
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  const hydrateToken = useSessionStore((s) => s.token);
  const token = useSessionStore((s) => s.token);
  /** Used with RevenueCat so server webhooks (`app_user_id`) map to Laravel `users.id`. */
  const laravelUserId = useSessionStore((s) => s.user?.id ?? null);
  /** Avoid `queryClient.clear()` on cold start while token is still `null` before Zustand rehydrates (races TanStack persist restore). */
  const hadTruthyTokenRef = useRef(false);

  useEffect(() => {
    if (hydrateToken) {
      setAuthToken(hydrateToken);
    }
  }, [hydrateToken]);

  useEffect(() => {
    if (!token) {
      return;
    }
    void queryClient.prefetchQuery({ queryKey: Qk.shopProfile, queryFn: fetchShopProfile });
    void queryClient.prefetchQuery({
      queryKey: Qk.customersPage(1),
      queryFn: () => fetchCustomersPage(1),
    });
    void queryClient.prefetchQuery({ queryKey: Qk.reportSummary, queryFn: fetchReportSummary });
  }, [token]);

  useEffect(() => {
    if (token) {
      hadTruthyTokenRef.current = true;
      return;
    }
    /** Only clear API cache on real logout — not while token is null before Zustand rehydrates. */
    if (hadTruthyTokenRef.current) {
      hadTruthyTokenRef.current = false;
      void queryClient.clear();
    }
  }, [token]);

  useEffect(() => {
    if (Platform.OS === "web") {
      return;
    }
    if (!token) {
      void cancelWeeklyInsightsReminder();
      return;
    }
    void scheduleWeeklyInsightsReminder();
  }, [token]);

  useEffect(() => {
    let cancelled = false;

    const invalidateSyncedData = async () => {
      await queryClient.invalidateQueries({ queryKey: Qk.reportSummary });
      await queryClient.invalidateQueries({ queryKey: Qk.insights });
      await queryClient.invalidateQueries({
        predicate: (q) =>
          Array.isArray(q.queryKey) &&
          (q.queryKey[0] === "customers" || q.queryKey[0] === "customer"),
      });
    };

    const tryFlush = async () => {
      if (!useSessionStore.getState().token) {
        return;
      }
      try {
        const r = await flushAllOutboxes();
        if (!cancelled && (r.customers.sent > 0 || r.transactions.sent > 0)) {
          await invalidateSyncedData();
        }
      } catch {
        /** queue flush is best-effort */
      }
    };

    void tryFlush();

    const unsubNet = NetInfo.addEventListener((s) => {
      if (s.isConnected !== false && s.isInternetReachable !== false) {
        void tryFlush();
      }
    });

    const onAppState = (next: AppStateStatus) => {
      if (next === "active") {
        void tryFlush();
      }
    };
    const subApp = AppState.addEventListener("change", onAppState);

    return () => {
      cancelled = true;
      unsubNet();
      subApp.remove();
    };
  }, [token]);

  useEffect(() => {
    if (Platform.OS === "web" || !token) {
      return;
    }

    let cancelled = false;
    let listenerAdded = false;
    const listener = () => {
      void queryClient.invalidateQueries({ queryKey: Qk.premiumRecordingAccess });
    };

    void (async () => {
      const ok = await ensureRevenueCatConfigured();
      if (cancelled || !ok) {
        return;
      }

      Purchases.addCustomerInfoUpdateListener(listener);
      listenerAdded = true;
    })();

    return () => {
      cancelled = true;
      if (listenerAdded) {
        Purchases.removeCustomerInfoUpdateListener(listener);
      }
    };
  }, [token]);

  useEffect(() => {
    if (Platform.OS === "web") {
      return;
    }

    let cancelled = false;

    void (async () => {
      if (!token || laravelUserId == null) {
        try {
          if (await ensureRevenueCatConfigured()) {
            await Purchases.logOut();
          }
        } catch {
          /** ignore logout when SDK not wired */
        }

        return;
      }

      const ok = await ensureRevenueCatConfigured();
      if (cancelled || !ok) {
        return;
      }

      try {
        await Purchases.logIn(String(laravelUserId));
      } catch (e: unknown) {
        console.warn("[BakiMate][RevenueCat] Purchases.logIn failed:", e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, laravelUserId]);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        buster: "bakimate-v4-no-premium-persist",
        dehydrateOptions: {
          shouldDehydrateQuery: shouldDehydrateQueryForPersist,
        },
      }}
    >
      <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
    </PersistQueryClientProvider>
  );
}
