import { BigActionButton } from "@/components/ui/big-action-button";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { MoneyDisplay } from "@/components/ui/money-display";
import { MoneyKeypad } from "@/components/money-keypad";
import { QuickAmountChips } from "@/components/ui/quick-amount-chips";
import { BakimateColors } from "@/constants/bakimate-theme";
import { Colors } from "@/constants/theme";
import type { Supplier } from "@/lib/api-types";
import { useRecordSupplierLedger } from "@/lib/hooks/useSuppliers";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type Mode = "purchase" | "payment_out";

type Props = {
  visible: boolean;
  mode: Mode | null;
  supplier: Supplier;
  currency: string;
  isDark: boolean;
  onClose: () => void;
  onSaved: () => void;
};

/**
 * Supplier ledger sheet. `purchase` increases what the shop owes (red),
 * `payment_out` is money paid to the supplier (green). Same big keypad +
 * banknote chips + green-check / red-X pattern as the customer sheet.
 */
export function RecordSupplierSheet({
  visible,
  mode,
  supplier,
  currency,
  isDark,
  onClose,
  onSaved,
}: Props) {
  const { t } = useTranslation();
  const headline = Colors[isDark ? "dark" : "light"].text;
  const muted = isDark ? BakimateColors.neutralTextMutedDark : BakimateColors.neutralText;

  const [valueSen, setValueSen] = useState(0);
  const [note, setNote] = useState("");
  const [moreOpen, setMoreOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);

  const recordMut = useRecordSupplierLedger();

  if (!mode) return null;

  const isPurchase = mode === "purchase";
  const accentColor = isPurchase ? BakimateColors.danger : BakimateColors.success;

  const resetState = () => {
    setValueSen(0);
    setNote("");
    setMoreOpen(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleSave = () => {
    if (valueSen <= 0) {
      Alert.alert(t("error"), t("amount_invalid"));
      return;
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    recordMut.mutate(
      {
        supplier_id: supplier.id,
        amount_sen: valueSen,
        type: mode,
        note: note.trim() || undefined,
      },
      {
        onSuccess: () => {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          setSuccessOpen(true);
          onSaved();
          setTimeout(() => {
            setSuccessOpen(false);
            handleClose();
          }, 900);
        },
        onError: (e: unknown) =>
          Alert.alert(t("error"), e instanceof Error ? e.message : String(e)),
      },
    );
  };

  return (
    <BottomSheet visible={visible} onClose={handleClose} isDark={isDark} scrollable>
      {successOpen ? (
        <View style={styles.successWrap}>
          <View style={[styles.successDisc, { backgroundColor: BakimateColors.success }]}>
            <Ionicons name="checkmark" size={88} color="#fff" />
          </View>
        </View>
      ) : (
        <>
          <View style={styles.headerRow}>
            <View style={[styles.headerIcon, { backgroundColor: `${accentColor}1F` }]}>
              <Ionicons
                name={isPurchase ? "cart" : "cash"}
                size={28}
                color={accentColor}
              />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <MoneyDisplay
                sen={valueSen}
                currencyCode={currency}
                size="large"
                color={valueSen > 0 ? accentColor : muted}
              />
              <Text style={[styles.headerCaption, { color: muted }]} numberOfLines={1}>
                {supplier.name}
              </Text>
            </View>
          </View>

          <View style={{ marginTop: 6, marginBottom: 8 }}>
            <QuickAmountChips
              currencyCode={currency}
              isDark={isDark}
              onAdd={(major) => setValueSen((v) => v + major * 100)}
            />
          </View>

          <View style={{ marginTop: 6 }}>
            <MoneyKeypad valueSen={valueSen} onChangeSen={setValueSen} />
          </View>

          <Pressable
            onPress={() => setMoreOpen((p) => !p)}
            accessibilityRole="button"
            style={({ pressed }) => [styles.moreToggle, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Ionicons name={moreOpen ? "chevron-up" : "chevron-down"} size={20} color={muted} />
            <Text style={[styles.moreToggleText, { color: muted }]}>{t("note_optional")}</Text>
          </Pressable>

          {moreOpen ? (
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder={t("note_placeholder")}
              placeholderTextColor={muted}
              multiline
              style={[
                styles.input,
                {
                  borderColor: isDark ? BakimateColors.glassBorderDark : "rgba(15, 23, 42, 0.12)",
                  color: headline,
                  backgroundColor: isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(255, 255, 255, 0.5)",
                },
              ]}
            />
          ) : null}

          <View style={styles.footerActions}>
            <BigActionButton
              onPress={handleClose}
              icon="close"
              variant="danger"
              size="lg"
              label={t("cancel")}
              accessibilityLabel={t("cancel")}
              style={styles.footerBtn}
            />
            <BigActionButton
              onPress={handleSave}
              icon="checkmark"
              variant="success"
              size="lg"
              label={t("save")}
              accessibilityLabel={t("save")}
              disabled={recordMut.isPending}
              style={styles.footerBtn}
            />
          </View>

          {recordMut.isPending ? (
            <View style={styles.busyOverlay} pointerEvents="none">
              <ActivityIndicator color={BakimateColors.accentTeal} />
            </View>
          ) : null}
        </>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingTop: 4,
    paddingBottom: 8,
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCaption: { marginTop: 4, fontSize: 13, fontWeight: "700" },
  moreToggle: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "center",
    paddingVertical: 6,
  },
  moreToggleText: { fontSize: 13, fontWeight: "800" },
  input: {
    marginTop: 6,
    minHeight: 80,
    textAlignVertical: "top",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontWeight: "600",
    fontSize: 16,
  },
  footerActions: { flexDirection: "row", gap: 12, marginTop: 18 },
  footerBtn: { flex: 1 },
  busyOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15, 23, 42, 0.18)",
  },
  successWrap: {
    minHeight: 220,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 36,
  },
  successDisc: {
    width: 140,
    height: 140,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
});
