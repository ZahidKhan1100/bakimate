import { BottomSheet } from "@/components/ui/bottom-sheet";
import { BakimateColors } from "@/constants/bakimate-theme";
import { Colors } from "@/constants/theme";
import type { SupplierLedgerTransactionApi } from "@/lib/api-types";
import { formatMonthLabel, recentMonthKeys } from "@/lib/calendar-ymd";
import { formatCalendarDateShort } from "@/lib/format-dates";
import { formatMoneyMinor } from "@/lib/money";
import { fetchSupplierLedger } from "@/lib/suppliers-api";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Text } from "@/components/ui/text";

type Props = {
  visible: boolean;
  supplierId: number;
  supplierName: string;
  currencyCode: string;
  isDark: boolean;
  onClose: () => void;
};

export function SupplierLedgerSheet({
  visible,
  supplierId,
  supplierName,
  currencyCode,
  isDark,
  onClose,
}: Props) {
  const { t, i18n } = useTranslation();
  const headline = Colors[isDark ? "dark" : "light"].text;
  const muted = isDark ? BakimateColors.neutralTextMutedDark : BakimateColors.neutralText;
  const months = useMemo(() => recentMonthKeys(18), []);
  const [month, setMonth] = useState<string | null>(null);

  const ledgerQ = useQuery({
    queryKey: ["supplier-ledger", supplierId, month],
    queryFn: () => fetchSupplierLedger(supplierId, month),
    enabled: visible && supplierId > 0,
  });

  const rows = ledgerQ.data?.transactions ?? [];

  return (
    <BottomSheet visible={visible} onClose={onClose} isDark={isDark}>
      <Text style={[styles.title, { color: headline }]} numberOfLines={2}>
        {t("supplier_ledger_title", { name: supplierName })}
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.monthRow}
        style={styles.monthScroll}
      >
        <Pressable
          onPress={() => setMonth(null)}
          style={[
            styles.monthChip,
            {
              backgroundColor:
                month === null
                  ? isDark
                    ? "rgba(46, 196, 182, 0.2)"
                    : "rgba(0, 135, 90, 0.12)"
                  : isDark
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(15,23,42,0.06)",
              borderColor: month === null ? BakimateColors.accentTeal : "transparent",
            },
          ]}
        >
          <Text
            style={[
              styles.monthChipText,
              { color: month === null ? BakimateColors.accentTeal : muted },
            ]}
          >
            {t("supplier_ledger_all")}
          </Text>
        </Pressable>
        {months.map((m) => {
          const sel = month === m;
          return (
            <Pressable
              key={m}
              onPress={() => setMonth(m)}
              style={[
                styles.monthChip,
                {
                  backgroundColor: sel
                    ? isDark
                      ? "rgba(46, 196, 182, 0.2)"
                      : "rgba(0, 135, 90, 0.12)"
                    : isDark
                      ? "rgba(255,255,255,0.06)"
                      : "rgba(15,23,42,0.06)",
                  borderColor: sel ? BakimateColors.accentTeal : "transparent",
                },
              ]}
            >
              <Text
                style={[
                  styles.monthChipText,
                  { color: sel ? BakimateColors.accentTeal : muted },
                ]}
              >
                {formatMonthLabel(m, i18n.language)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {ledgerQ.data ? (
        <View style={styles.totalsRow}>
          <Text style={[styles.totalsText, { color: muted }]}>
            {t("supplier_ledger_purchases")}:{" "}
            <Text style={{ color: BakimateColors.danger, fontWeight: "800" }}>
              {formatMoneyMinor(ledgerQ.data.totals.purchases_sen, currencyCode)}
            </Text>
          </Text>
          <Text style={[styles.totalsText, { color: muted }]}>
            {t("supplier_ledger_payments")}:{" "}
            <Text style={{ color: BakimateColors.success, fontWeight: "800" }}>
              {formatMoneyMinor(ledgerQ.data.totals.payments_out_sen, currencyCode)}
            </Text>
          </Text>
        </View>
      ) : null}

      {ledgerQ.isLoading ? (
        <ActivityIndicator style={{ marginVertical: 24 }} color={BakimateColors.accentTeal} />
      ) : ledgerQ.isError ? (
        <Text style={{ color: BakimateColors.danger, marginVertical: 16 }}>{t("error")}</Text>
      ) : rows.length === 0 ? (
        <Text style={[styles.empty, { color: muted }]}>{t("supplier_tx_empty")}</Text>
      ) : (
        <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 24 }}>
          {rows.map((tx) => (
            <LedgerRow key={tx.id} tx={tx} currencyCode={currencyCode} isDark={isDark} language={i18n.language} />
          ))}
        </ScrollView>
      )}
    </BottomSheet>
  );
}

function LedgerRow({
  tx,
  currencyCode,
  isDark,
  language,
}: {
  tx: SupplierLedgerTransactionApi;
  currencyCode: string;
  isDark: boolean;
  language: string;
}) {
  const headline = Colors[isDark ? "dark" : "light"].text;
  const muted = isDark ? BakimateColors.neutralTextMutedDark : BakimateColors.neutralText;
  const isPurchase = tx.type === "purchase";
  const accent = isPurchase ? BakimateColors.danger : BakimateColors.success;

  return (
    <View
      style={[
        styles.row,
        {
          borderBottomColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)",
        },
      ]}
    >
      <Ionicons name={isPurchase ? "cart" : "cash"} size={18} color={accent} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.rowTitle, { color: headline }]}>
          {isPurchase ? "+" : "−"}
          {formatMoneyMinor(tx.amount_sen, currencyCode, language)}
        </Text>
        {tx.note ? (
          <Text style={[styles.rowMeta, { color: muted }]} numberOfLines={2}>
            {tx.note}
          </Text>
        ) : null}
      </View>
      {tx.created_at ? (
        <Text style={[styles.rowDate, { color: muted }]}>
          {formatCalendarDateShort(tx.created_at, language)}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: "800", marginBottom: 12 },
  monthScroll: { maxHeight: 44, marginBottom: 10 },
  monthRow: { gap: 8, paddingRight: 8 },
  monthChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  monthChipText: { fontSize: 13, fontWeight: "800" },
  totalsRow: { gap: 4, marginBottom: 10 },
  totalsText: { fontSize: 13, fontWeight: "600" },
  empty: { textAlign: "center", marginVertical: 20, fontSize: 15 },
  list: { maxHeight: 420 },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowTitle: { fontSize: 16, fontWeight: "800" },
  rowMeta: { fontSize: 13, marginTop: 2 },
  rowDate: { fontSize: 14, fontWeight: "600", marginTop: 2 },
});
