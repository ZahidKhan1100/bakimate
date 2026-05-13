import "@/lib/i18n";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import NetInfo from "@react-native-community/netinfo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { defaultShouldDehydrateQuery, type Query } from "@tanstack/query-core";
import { useEffect } from "react";
import { I18nextProvider } from "react-i18next";
import { Platform } from "react-native";
import Purchases from "react-native-purchases";

import { setAuthToken } from "@/lib/api";
import { Qk } from "@/lib/hooks/query-keys";
import i18n from "@/lib/i18n";
import { queryClient } from "@/lib/query-client";
import { ensureRevenueCatConfigured } from "@/lib/revenuecat-configure";
import { fetchShopProfile } from "@/lib/shop-api";
import { flushTransactionOutbox } from "@/lib/transaction-outbox";
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
  }, [token]);

  useEffect(() => {
    if (!token) {
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
        const r = await flushTransactionOutbox();
        if (!cancelled && r.sent > 0) {
          await invalidateSyncedData();
        }
      } catch {
        /** queue flush is best-effort */
      }
    };

    void tryFlush();

    const unsub = NetInfo.addEventListener((s) => {
      if (s.isConnected !== false && s.isInternetReachable !== false) {
        void tryFlush();
      }
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, [token]);

  useEffect(() => {
    if (Platform.OS === "web" || !token) {
      return;
    }

    let cancelled = false;
    const listener = () => {
      void queryClient.invalidateQueries({ queryKey: Qk.premiumRecordingAccess });
    };

    void (async () => {
      const ok = await ensureRevenueCatConfigured();
      if (cancelled || !ok) {
        return;
      }

      Purchases.addCustomerInfoUpdateListener(listener);
    })();

    return () => {
      cancelled = true;
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, [token]);

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
