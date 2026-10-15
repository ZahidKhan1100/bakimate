import { BottomSheet } from "@/components/ui/bottom-sheet";
import { MoneyDisplay } from "@/components/ui/money-display";
import { BakimateColors } from "@/constants/bakimate-theme";
import { Colors } from "@/constants/theme";
import type { CustomerLedgerTransactionApi } from "@/lib/api-types";
import { formatCalendarDateShort } from "@/lib/format-dates";
import { Ionicons } from "@expo/vector-icons";
import { type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { Text } from "@/components/ui/text";

export type CustomerTransactionDetailBodyProps = {
  tx: CustomerLedgerTransactionApi;
  customerName: string;
  currencyCode: string;
  isDark: boolean;
  pdfBusy: boolean;
  actionsDisabled?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onSharePdf: () => void;
};

type SheetProps = CustomerTransactionDetailBodyProps & {
  visible: boolean;
  onClose: () => void;
};

function DetailField({
  label,
  children,
  muted,
}: {
  label: string;
  children: ReactNode;
  muted: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: muted }]}>{label}</Text>
      {children}
    </View>
  );
}

/** Detail content (no modal) — embed in All records or wrap with {@link CustomerTransactionDetailSheet}. */
export function CustomerTransactionDetailBody({
  tx,
  customerName,
  currencyCode,
  isDark,
  pdfBusy,
  actionsDisabled = false,
  onEdit,
  onDelete,
  onSharePdf,
}: CustomerTransactionDetailBodyProps) {
  const { t, i18n } = useTranslation();
  const headline = Colors[isDark ? "dark" : "light"].text;
  const muted = isDark ? BakimateColors.neutralTextMutedDark : BakimateColors.neutralText;

  const isCredit = tx.type === "credit";
  const accent = isCredit ? BakimateColors.danger : BakimateColors.success;
  const typeLabel = isCredit ? t("customer_tx_credit") : t("customer_tx_payment");
  const dateLabel = tx.created_at
    ? formatCalendarDateShort(tx.created_at, i18n.language)
    : t("customer_tx_detail_date_unknown");

  return (
    <>
      <View style={[styles.typePill, { backgroundColor: `${accent}22`, borderColor: accent }]}>
        <Ionicons name={isCredit ? "arrow-up" : "arrow-down"} size={22} color={accent} />
        <Text style={[styles.typePillText, { color: accent }]}>{typeLabel}</Text>
      </View>

      <Text style={[styles.customerName, { color: muted }]} numberOfLines={2}>
        {customerName}
      </Text>

      <View style={styles.amountBlock}>
        <MoneyDisplay
          sen={tx.amount_sen}
          currencyCode={currencyCode}
          tone={isCredit ? "debt" : "paid"}
          size="huge"
          align="center"
        />
      </View>

      <View
        style={[
          styles.detailsCard,
          {
            borderColor: isDark ? BakimateColors.glassBorderDark : "rgba(15,23,42,0.1)",
            backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.03)",
          },
        ]}
      >
        <DetailField label={t("customer_tx_detail_date")} muted={muted}>
          <Text style={[styles.fieldValue, { color: headline }]}>{dateLabel}</Text>
        </DetailField>

        {isCredit ? (
          <DetailField label={t("customer_tx_detail_item")} muted={muted}>
            <Text style={[styles.fieldValue, { color: headline }]}>
              {tx.item_key?.trim() ? tx.item_key.trim() : t("customer_tx_detail_no_item")}
            </Text>
          </DetailField>
        ) : null}

        <DetailField label={t("customer_tx_detail_note")} muted={muted}>
          <Text style={[styles.fieldValue, { color: headline }]}>
            {tx.note?.trim() ? tx.note.trim() : t("customer_tx_detail_no_note")}
          </Text>
        </DetailField>
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={onSharePdf}
          disabled={actionsDisabled || pdfBusy}
          accessibilityRole="button"
          accessibilityLabel={t("customer_tx_pdf_a11y")}
          style={({ pressed }) => [
            styles.pdfPrimaryBtn,
            { opacity: actionsDisabled || pdfBusy ? 0.55 : pressed ? 0.88 : 1 },
          ]}
        >
          {pdfBusy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="document-text-outline" size={24} color="#fff" />
              <Text style={styles.pdfPrimaryBtnText}>{t("customer_tx_pdf_btn")}</Text>
            </>
          )}
        </Pressable>

        <Pressable
          onPress={onEdit}
          disabled={actionsDisabled}
          accessibilityRole="button"
          accessibilityLabel={t("customer_tx_edit_action")}
          style={({ pressed }) => [
            styles.actionBtn,
            {
              borderColor: accent,
              backgroundColor: `${accent}14`,
              opacity: actionsDisabled ? 0.5 : pressed ? 0.82 : 1,
            },
          ]}
        >
          <Ionicons name="create-outline" size={22} color={accent} />
          <Text style={[styles.actionBtnText, { color: accent }]}>{t("customer_tx_edit_action")}</Text>
        </Pressable>

        <Pressable
          onPress={onDelete}
          disabled={actionsDisabled}
          accessibilityRole="button"
          accessibilityLabel={t("customer_tx_delete_action")}
          style={({ pressed }) => [
            styles.actionBtn,
            {
              borderColor: BakimateColors.danger,
              backgroundColor: isDark ? `${BakimateColors.danger}18` : `${BakimateColors.danger}12`,
              opacity: actionsDisabled ? 0.5 : pressed ? 0.82 : 1,
            },
          ]}
        >
          <Ionicons name="trash-outline" size={22} color={BakimateColors.danger} />
          <Text style={[styles.actionBtnText, { color: BakimateColors.danger }]}>
            {t("customer_tx_delete_action")}
          </Text>
        </Pressable>
      </View>
    </>
  );
}

export function CustomerTransactionDetailSheet({
  visible,
  tx,
  onClose,
  ...bodyProps
}: SheetProps) {
  if (!tx) {
    return null;
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} isDark={bodyProps.isDark} scrollable>
      <CustomerTransactionDetailBody tx={tx} {...bodyProps} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  typePill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    marginBottom: 8,
  },
  typePillText: { fontSize: 14, fontWeight: "900" },
  customerName: { fontSize: 14, fontWeight: "700", marginBottom: 12 },
  amountBlock: { alignItems: "center", marginBottom: 16 },
  detailsCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 14,
    marginBottom: 18,
  },
  field: { gap: 4 },
  fieldLabel: { fontSize: 14, fontWeight: "800", letterSpacing: 0.3, textTransform: "uppercase" },
  fieldValue: { fontSize: 16, fontWeight: "700", lineHeight: 22 },
  actions: { gap: 10 },
  pdfPrimaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 16,
    backgroundColor: BakimateColors.accentTeal,
    marginBottom: 4,
  },
  pdfPrimaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "900" },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  actionBtnText: { fontSize: 15, fontWeight: "900" },
});
