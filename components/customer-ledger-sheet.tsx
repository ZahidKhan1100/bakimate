import { CustomerTransactionDetailBody } from "@/components/customer-transaction-detail-sheet";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { BakimateColors } from "@/constants/bakimate-theme";
import { Colors } from "@/constants/theme";
import type { CustomerLedgerTransactionApi } from "@/lib/api-types";
import { formatMonthLabel, recentMonthKeys } from "@/lib/calendar-ymd";
import { fetchCustomerLedger } from "@/lib/customers-api";
import { formatCalendarDateShort } from "@/lib/format-dates";
import { formatMoneyMinor } from "@/lib/money";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
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
  customerId: number;
  customerName: string;
  currencyCode: string;
  isDark: boolean;
  pdfBusyId: number | null;
  actionsDisabled?: boolean;
  onClose: () => void;
  onEditTx: (tx: CustomerLedgerTransactionApi) => void;
  onDeleteTx: (tx: CustomerLedgerTransactionApi) => void;
  onSharePdf: (tx: CustomerLedgerTransactionApi) => void;
};

export function CustomerLedgerSheet({
  visible,
  customerId,
  customerName,
  currencyCode,
  isDark,
  pdfBusyId,
  actionsDisabled = false,
  onClose,
  onEditTx,
  onDeleteTx,
  onSharePdf,
}: Props) {
  const { t, i18n } = useTranslation();
  const headline = Colors[isDark ? "dark" : "light"].text;
  const muted = isDark ? BakimateColors.neutralTextMutedDark : BakimateColors.neutralText;
  const months = useMemo(() => recentMonthKeys(18), []);
  const [month, setMonth] = useState<string | null>(null);
  const [detailTx, setDetailTx] = useState<CustomerLedgerTransactionApi | null>(null);

  useEffect(() => {
    if (!visible) {
      setDetailTx(null);
    }
  }, [visible]);

  const ledgerQ = useQuery({
    queryKey: ["customer-ledger", customerId, month],
    queryFn: () => fetchCustomerLedger(customerId, month),
    enabled: visible && customerId > 0,
  });

  const rows = ledgerQ.data?.transactions ?? [];

  useEffect(() => {
    if (detailTx && !rows.some((r) => r.id === detailTx.id)) {
      setDetailTx(null);
    }
  }, [rows, detailTx]);

  const handleSheetClose = () => {
    if (detailTx) {
      setDetailTx(null);
      return;
    }
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={handleSheetClose} isDark={isDark} scrollable>
      {detailTx ? (
        <>
          <Pressable
            onPress={() => setDetailTx(null)}
            accessibilityRole="button"
            accessibilityLabel={t("customer_ledger_back")}
            style={({ pressed }) => [styles.backRow, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Ionicons name="chevron-back" size={24} color={BakimateColors.accentTeal} />
            <Text style={[styles.backText, { color: BakimateColors.accentTeal }]}>
              {t("customer_ledger_back")}
            </Text>
          </Pressable>
          <CustomerTransactionDetailBody
            tx={detailTx}
            customerName={customerName}
            currencyCode={currencyCode}
            isDark={isDark}
            pdfBusy={pdfBusyId === detailTx.id}
            actionsDisabled={actionsDisabled}
            onEdit={() => onEditTx(detailTx)}
            onDelete={() => onDeleteTx(detailTx)}
            onSharePdf={() => onSharePdf(detailTx)}
          />
        </>
      ) : (
        <>
          <Text style={[styles.title, { color: headline }]} numberOfLines={2}>
            {t("customer_ledger_title", { name: customerName })}
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
                {t("customer_ledger_all")}
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
                {t("customer_ledger_credit")}:{" "}
                <Text style={{ color: BakimateColors.danger, fontWeight: "800" }}>
                  {formatMoneyMinor(ledgerQ.data.totals.credit_given_sen, currencyCode)}
                </Text>
              </Text>
              <Text style={[styles.totalsText, { color: muted }]}>
                {t("customer_ledger_paid")}:{" "}
                <Text style={{ color: BakimateColors.success, fontWeight: "800" }}>
                  {formatMoneyMinor(ledgerQ.data.totals.payments_collected_sen, currencyCode)}
                </Text>
              </Text>
            </View>
          ) : null}

          {ledgerQ.isLoading ? (
            <ActivityIndicator style={{ marginVertical: 24 }} color={BakimateColors.accentTeal} />
          ) : ledgerQ.isError ? (
            <Text style={{ color: BakimateColors.danger, marginVertical: 16 }}>{t("error")}</Text>
          ) : rows.length === 0 ? (
            <Text style={[styles.empty, { color: muted }]}>{t("customer_tx_empty")}</Text>
          ) : (
            <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 24 }}>
              {rows.map((tx) => (
                <LedgerRow
                  key={tx.id}
                  tx={tx}
                  currencyCode={currencyCode}
                  isDark={isDark}
                  language={i18n.language}
                  onPress={() => setDetailTx(tx)}
                />
              ))}
            </ScrollView>
          )}
        </>
      )}
    </BottomSheet>
  );
}

function LedgerRow({
  tx,
  currencyCode,
  isDark,
  language,
  onPress,
}: {
  tx: CustomerLedgerTransactionApi;
  currencyCode: string;
  isDark: boolean;
  language: string;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const headline = Colors[isDark ? "dark" : "light"].text;
  const muted = isDark ? BakimateColors.neutralTextMutedDark : BakimateColors.neutralText;
  const isCredit = tx.type === "credit";
  const accent = isCredit ? BakimateColors.danger : BakimateColors.success;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t("customer_tx_detail_open_a11y")}
      style={({ pressed }) => [
        styles.row,
        styles.rowPressable,
        {
          borderBottomColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)",
          opacity: pressed ? 0.82 : 1,
        },
      ]}
    >
      <Ionicons name={isCredit ? "arrow-up" : "arrow-down"} size={18} color={accent} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.rowTitle, { color: headline }]}>
          {isCredit ? "+" : "−"}
          {formatMoneyMinor(tx.amount_sen, currencyCode, language)}
        </Text>
        {tx.item_key ? (
          <Text style={[styles.rowMeta, { color: muted }]} numberOfLines={1}>
            {tx.item_key}
          </Text>
        ) : null}
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
      <Ionicons name="chevron-forward" size={18} color={muted} style={{ marginTop: 2 }} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 12,
    alignSelf: "flex-start",
  },
  backText: { fontSize: 15, fontWeight: "800" },
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
  rowPressable: { paddingHorizontal: 2 },
  rowTitle: { fontSize: 16, fontWeight: "800" },
  rowMeta: { fontSize: 13, marginTop: 2 },
  rowDate: { fontSize: 14, fontWeight: "600", marginTop: 2 },
});
