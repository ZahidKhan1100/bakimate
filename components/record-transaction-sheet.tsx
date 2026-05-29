import { BigActionButton } from "@/components/ui/big-action-button";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { MoneyDisplay } from "@/components/ui/money-display";
import { MoneyKeypad } from "@/components/money-keypad";
import { QuickAmountChips } from "@/components/ui/quick-amount-chips";
import { BakimateColors } from "@/constants/bakimate-theme";
import { Colors } from "@/constants/theme";
import type { Customer, CustomerLedgerTransactionApi } from "@/lib/api-types";
import { isPremiumRecordingBlockedError } from "@/lib/errors/premium-recording-blocked-error";
import { formatCalendarDateShort } from "@/lib/format-dates";
import { useRecordTransaction } from "@/lib/hooks/useRecordTransaction";
import { usePatchCustomerLedgerTransaction } from "@/lib/hooks/useLedgerTransactionMutations";
import {
  buildCreditRecordedWhatsAppMessage,
  buildPaymentReceiptWhatsAppMessage,
} from "@/lib/payment-receipt";
import { iconForQuickItem } from "@/lib/quick-item-icons";
import { shareCreditInvoicePdf, sharePaymentReceiptPdf } from "@/lib/pdf-download";
import { profileToReceiptBlurb, resolveShopProfile } from "@/lib/shop-profile";
import type { OutboxTransactionPayload } from "@/lib/transaction-outbox";
import { useVoiceNoteComposer } from "@/lib/use-voice-note";
import { openWhatsAppText } from "@/lib/whatsapp";
import { normalizePhoneForWaMe } from "@/lib/phone-wa-me";
import { useSessionStore } from "@/stores/session-store";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type Mode = "credit" | "payment";

type Props = {
  visible: boolean;
  mode: Mode | null;
  customer: Customer;
  currency: string;
  isDark: boolean;
  quickItems: string[];
  /** Pass null when the shop has no QR uploaded yet. */
  duitnowQrUrl: string | null;
  onClose: () => void;
  onOpenDuitnowQr: () => void;
  /** Called after a successful save so the parent can refetch. */
  onSaved: () => void;
  /** When set, the sheet PATCHes this ledger row instead of POSTing a new one. */
  editingTransaction?: CustomerLedgerTransactionApi | null;
};

function addDaysLocal(days: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}

/**
 * Low-literacy record sheet: pictogram title, big live amount, numeric keypad,
 * banknote quick-amount chips, icon-led quick-item chips, instalment due-date tiles,
 * and big check/X confirm. The note + voice mic + Qist goal sit behind a
 * "more options" chevron so the default flow is two taps.
 */
export function RecordTransactionSheet({
  visible,
  mode,
  customer,
  currency,
  isDark,
  quickItems,
  duitnowQrUrl,
  onClose,
  onOpenDuitnowQr,
  onSaved,
  editingTransaction = null,
}: Props) {
  const { t, i18n } = useTranslation();
  const headline = Colors[isDark ? "dark" : "light"].text;
  const muted = isDark ? BakimateColors.neutralTextMutedDark : BakimateColors.neutralText;
  const recordMut = useRecordTransaction();
  const patchMut = usePatchCustomerLedgerTransaction(customer.id);

  const [valueSen, setValueSen] = useState(0);
  const [note, setNote] = useState("");
  const [selectedQuickItem, setSelectedQuickItem] = useState<string | null>(null);
  const [nextDue, setNextDue] = useState<string | null>(null);
  const [goalAmountRmText, setGoalAmountRmText] = useState("");
  const [goalPayByYmd, setGoalPayByYmd] = useState("");
  const [moreOpen, setMoreOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);

  const resetState = () => {
    setValueSen(0);
    setNote("");
    setSelectedQuickItem(null);
    setNextDue(null);
    setGoalAmountRmText("");
    setGoalPayByYmd("");
    setMoreOpen(false);
  };

  const editingId = editingTransaction?.id ?? 0;

  useEffect(() => {
    if (!visible) return;
    if (editingTransaction) {
      setSuccessOpen(false);
      setValueSen(editingTransaction.amount_sen);
      setNote(editingTransaction.note ?? "");
      setSelectedQuickItem(editingTransaction.item_key?.trim() || null);
      setNextDue(null);
      setGoalAmountRmText("");
      setGoalPayByYmd("");
      setMoreOpen(
        Boolean(
          (editingTransaction.note ?? "").trim() ||
            (editingTransaction.item_key ?? "").trim(),
        ),
      );
    } else {
      resetState();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resetBranch uses stable resetState-shaped fields only when opening/closing modes
  }, [visible, editingId]);

  const speechLocale = i18n.language.startsWith("ms") ? "ms-MY" : "en-US";
  const { speechAvailable, listening, toggleListening } = useVoiceNoteComposer({
    locale: speechLocale,
    onAppendFinal: (text) => setNote((p) => (p.trim() ? `${p.trim()} ${text}` : text)),
  });

  if (!mode) return null;

  const isCredit = mode === "credit";
  const isEditing = editingTransaction != null;
  const accentColor = isCredit ? BakimateColors.danger : BakimateColors.success;
  const presets = { d7: addDaysLocal(7), d14: addDaysLocal(14), d30: addDaysLocal(30) };

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

    if (editingTransaction) {
      patchMut.mutate(
        {
          transactionId: editingTransaction.id,
          amount_sen: valueSen,
          note: note.trim() || null,
          item_key: isCredit ? selectedQuickItem?.trim() ?? null : null,
        },
        {
          onSuccess: () => {
            setSuccessOpen(true);
            onSaved();
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            setTimeout(() => {
              setSuccessOpen(false);
              handleClose();
            }, 820);
          },
          onError: (e: unknown) => {
            if (isPremiumRecordingBlockedError(e)) {
              handleClose();
              router.push("/paywall");
              return;
            }
            Alert.alert(t("error"), e instanceof Error ? e.message : String(e));
          },
        },
      );
      return;
    }

    const payload: OutboxTransactionPayload = {
      customer_id: customer.id,
      amount_sen: valueSen,
      type: isCredit ? "credit" : "payment",
      note: note.trim() || null,
      next_due_at: isCredit && nextDue ? nextDue : null,
    };

    if (isCredit) {
      const q = selectedQuickItem?.trim();
      if (q) payload.item_key = q;
      const goalMajor = Number.parseFloat(goalAmountRmText.replace(/,/g, "").trim());
      if (Number.isFinite(goalMajor) && goalMajor > 0) {
        payload.goal_amount_sen = Math.round(goalMajor * 100);
      }
      if (goalPayByYmd.trim() !== "") payload.goal_target_date = goalPayByYmd.trim();
    }

    recordMut.mutate(payload, {
      onSuccess: (res) => {
        setSuccessOpen(true);
        onSaved();
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

        if (res.queued) {
          setTimeout(() => {
            setSuccessOpen(false);
            handleClose();
            Alert.alert(t("saved_offline_title"), t("saved_offline_body"));
          }, 900);
          return;
        }

        if (!isCredit && res.remote?.customer) {
          const cust = res.remote.customer;
          const payTid = res.remote.transaction ? Number(res.remote.transaction.id) : NaN;
          const sessionState = useSessionStore.getState();
          const rawPhone = cust.phone ?? customer.phone;
          const msg = buildPaymentReceiptWhatsAppMessage({
            customer: { name: cust.name },
            paidSen: valueSen,
            remainingBalanceSen: cust.balance_sen,
            shop: profileToReceiptBlurb(
              resolveShopProfile(sessionState.shopProfiles ?? {}, sessionState.user?.id),
            ),
          });
          setTimeout(() => {
            setSuccessOpen(false);
            handleClose();
            const buttons: {
              text: string;
              style?: "cancel" | "destructive" | "default";
              onPress?: () => void;
            }[] = [
              { text: t("done"), style: "cancel" },
            ];
            if (Number.isFinite(payTid)) {
              buttons.unshift({
                text: t("share_pdf"),
                onPress: () => {
                  void sharePaymentReceiptPdf(customer.id, payTid, { whatsappPhone: rawPhone }).catch((err) => {
                    Alert.alert(t("error"), err instanceof Error ? err.message : String(err));
                  });
                },
              });
            }
            buttons.unshift({
              text: t("share_whatsapp"),
              onPress: () => {
                if (normalizePhoneForWaMe(rawPhone) === null) {
                  Alert.alert(t("error"), t("contact_phone_required_whatsapp"));
                  return;
                }
                void openWhatsAppText(msg, rawPhone).catch(() => {
                  Alert.alert(t("share_failed_title"), t("whatsapp_unavailable"));
                });
              },
            });
            Alert.alert(t("payment_saved_title"), t("payment_saved_body"), buttons);
          }, 900);
          return;
        }

        if (isCredit && res.remote?.transaction) {
          const tid = Number(res.remote.transaction.id);
          if (Number.isFinite(tid)) {
            const cust = res.remote.customer;
            const rawPhone = cust.phone ?? customer.phone;
            const sessionState = useSessionStore.getState();
            const msg = buildCreditRecordedWhatsAppMessage({
              customer: { name: cust.name },
              creditSen: valueSen,
              newBalanceSen: cust.balance_sen,
              shop: profileToReceiptBlurb(
                resolveShopProfile(sessionState.shopProfiles ?? {}, sessionState.user?.id),
              ),
            });
            setTimeout(() => {
              setSuccessOpen(false);
              handleClose();
              const buttons: {
                text: string;
                style?: "cancel" | "destructive" | "default";
                onPress?: () => void;
              }[] = [{ text: t("done"), style: "cancel" }];
              buttons.unshift({
                text: t("share_pdf"),
                onPress: () => {
                  void shareCreditInvoicePdf(customer.id, tid, { whatsappPhone: rawPhone }).catch((err) => {
                    Alert.alert(t("error"), err instanceof Error ? err.message : String(err));
                  });
                },
              });
              buttons.unshift({
                text: t("share_whatsapp"),
                onPress: () => {
                  if (normalizePhoneForWaMe(rawPhone) === null) {
                    Alert.alert(t("error"), t("contact_phone_required_whatsapp"));
                    return;
                  }
                  void openWhatsAppText(msg, rawPhone).catch(() => {
                    Alert.alert(t("share_failed_title"), t("whatsapp_unavailable"));
                  });
                },
              });
              Alert.alert(t("credit_invoice_title"), t("credit_invoice_body_whatsapp"), buttons);
            }, 900);
            return;
          }
        }

        setTimeout(() => {
          setSuccessOpen(false);
          handleClose();
        }, 900);
      },
      onError: (e: unknown) => {
        if (isPremiumRecordingBlockedError(e)) {
          handleClose();
          router.push("/paywall");
          return;
        }
        Alert.alert(t("error"), e instanceof Error ? e.message : String(e));
      },
    });
  };

  const dueTiles: { days: 7 | 14 | 30; ymd: string }[] = [
    { days: 7, ymd: presets.d7 },
    { days: 14, ymd: presets.d14 },
    { days: 30, ymd: presets.d30 },
  ];

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
              name={isCredit ? "arrow-up" : "arrow-down"}
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
              {customer.name}
            </Text>
            {isEditing ? (
              <Text style={[styles.sheetEditHint, { color: muted }]}>
                {isCredit ? t("ledger_sheet_edit_credit") : t("ledger_sheet_edit_payment")}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Quick amount chips */}
        <View style={{ marginTop: 6, marginBottom: 8 }}>
          <QuickAmountChips
            currencyCode={currency}
            isDark={isDark}
            onAdd={(major) => setValueSen((v) => v + major * 100)}
          />
        </View>

        {/* Big keypad */}
        <View style={{ marginTop: 6 }}>
          <MoneyKeypad valueSen={valueSen} onChangeSen={setValueSen} />
        </View>

        {/* Credit-only: quick item chips with pictograms */}
        {isCredit ? (
          <View style={styles.section}>
            <Text style={[styles.sectionHint, { color: muted }]} numberOfLines={1}>
              {t("sheet_quick_item")}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.itemRow}
              keyboardShouldPersistTaps="handled"
            >
              {quickItems.map((label) => {
                const sel = selectedQuickItem === label;
                return (
                  <Pressable
                    key={label}
                    onPress={() => setSelectedQuickItem((p) => (p === label ? null : label))}
                    style={({ pressed }) => [
                      styles.itemChip,
                      {
                        borderColor: sel ? BakimateColors.accentTeal : BakimateColors.border,
                        backgroundColor: sel
                          ? "rgba(46, 196, 182, 0.18)"
                          : isDark
                            ? "rgba(255,255,255,0.04)"
                            : "rgba(255,255,255,0.7)",
                        opacity: pressed ? 0.86 : 1,
                      },
                    ]}
                  >
                    <Ionicons
                      name={iconForQuickItem(label)}
                      size={24}
                      color={sel ? BakimateColors.accentTeal : headline}
                    />
                    <Text style={[styles.itemChipText, { color: headline }]} numberOfLines={1}>
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        {/* Credit-only: big due-date tiles */}
        {isCredit && !isEditing ? (
          <View style={styles.section}>
            <View style={styles.dueRow}>
              {dueTiles.map(({ days, ymd }) => {
                const sel = nextDue === ymd;
                return (
                  <Pressable
                    key={days}
                    onPress={() => setNextDue(sel ? null : ymd)}
                    style={({ pressed }) => [
                      styles.dueTile,
                      {
                        borderColor: sel ? BakimateColors.accentTeal : BakimateColors.border,
                        backgroundColor: sel
                          ? "rgba(46, 196, 182, 0.18)"
                          : isDark
                            ? "rgba(255,255,255,0.04)"
                            : "rgba(255,255,255,0.7)",
                        opacity: pressed ? 0.86 : 1,
                      },
                    ]}
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={26}
                      color={sel ? BakimateColors.accentTeal : headline}
                    />
                    <Text
                      style={[
                        styles.dueDayNum,
                        { color: sel ? BakimateColors.accentTeal : headline },
                      ]}
                    >
                      {days}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {nextDue ? (
              <Text style={[styles.dueResolved, { color: muted }]}>
                {formatCalendarDateShort(nextDue, i18n.language)}
              </Text>
            ) : null}
          </View>
        ) : null}

        {/* Payment-only: DuitNow QR shortcut */}
        {!isCredit && !isEditing ? (
          <Pressable
            onPress={onOpenDuitnowQr}
            style={({ pressed }) => [
              styles.qrLink,
              {
                borderColor: BakimateColors.accentTeal,
                backgroundColor: isDark
                  ? "rgba(46, 196, 182, 0.14)"
                  : "rgba(46, 196, 182, 0.1)",
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Ionicons name="qr-code-outline" size={26} color={BakimateColors.accentTeal} />
            <Text style={[styles.qrLinkText, { color: BakimateColors.accentTeal }]}>
              {duitnowQrUrl ? t("duitnow_show_qr") : t("duitnow_qr_missing_title")}
            </Text>
          </Pressable>
        ) : null}

        {/* More options chevron */}
        <Pressable
          onPress={() => setMoreOpen((p) => !p)}
          accessibilityRole="button"
          accessibilityLabel={t("note_optional")}
          style={({ pressed }) => [styles.moreToggle, { opacity: pressed ? 0.7 : 1 }]}
        >
          <Ionicons
            name={moreOpen ? "chevron-up" : "chevron-down"}
            size={20}
            color={muted}
          />
          <Text style={[styles.moreToggleText, { color: muted }]}>
            {moreOpen ? t("cancel") : t("note_optional")}
          </Text>
        </Pressable>

        {moreOpen ? (
          <View style={styles.moreSection}>
            <Text style={[styles.label, { color: muted }]}>{t("note_optional")}</Text>
            <View style={styles.noteRow}>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder={t("note_placeholder")}
                placeholderTextColor={muted}
                multiline
                style={[
                  styles.input,
                  styles.noteInput,
                  {
                    borderColor: isDark
                      ? BakimateColors.glassBorderDark
                      : "rgba(15, 23, 42, 0.12)",
                    color: headline,
                    backgroundColor: isDark
                      ? "rgba(255, 255, 255, 0.04)"
                      : "rgba(255, 255, 255, 0.5)",
                  },
                ]}
              />
              {speechAvailable ? (
                <Pressable
                  onPress={() => void toggleListening()}
                  style={[
                    styles.micHit,
                    {
                      borderColor: listening
                        ? BakimateColors.accentTeal
                        : isDark
                          ? BakimateColors.glassBorderDark
                          : "rgba(15, 23, 42, 0.12)",
                    },
                  ]}
                >
                  <Ionicons
                    name={listening ? "mic" : "mic-outline"}
                    size={22}
                    color={listening ? BakimateColors.danger : headline}
                  />
                </Pressable>
              ) : null}
            </View>

            {isCredit && !isEditing ? (
              <>
                <Text style={[styles.label, { color: muted }]}>{t("sheet_qist_goal_rm")}</Text>
                <TextInput
                  value={goalAmountRmText}
                  onChangeText={setGoalAmountRmText}
                  keyboardType="decimal-pad"
                  placeholder={t("sheet_qist_goal_placeholder")}
                  placeholderTextColor={muted}
                  style={[
                    styles.input,
                    {
                      borderColor: isDark
                        ? BakimateColors.glassBorderDark
                        : "rgba(15, 23, 42, 0.12)",
                      color: headline,
                      backgroundColor: isDark
                        ? "rgba(255, 255, 255, 0.04)"
                        : "rgba(255, 255, 255, 0.5)",
                    },
                  ]}
                />
                <Text style={[styles.label, { color: muted }]}>{t("sheet_qist_pay_by")}</Text>
                <TextInput
                  value={goalPayByYmd}
                  onChangeText={setGoalPayByYmd}
                  placeholder={t("sheet_qist_pay_by_placeholder")}
                  placeholderTextColor={muted}
                  autoCapitalize="none"
                  style={[
                    styles.input,
                    {
                      borderColor: isDark
                        ? BakimateColors.glassBorderDark
                        : "rgba(15, 23, 42, 0.12)",
                      color: headline,
                      backgroundColor: isDark
                        ? "rgba(255, 255, 255, 0.04)"
                        : "rgba(255, 255, 255, 0.5)",
                    },
                  ]}
                />
              </>
            ) : null}
          </View>
        ) : null}

        {/* Footer actions: big cancel + big save */}
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
            label={editingTransaction ? t("ledger_save_updates") : t("save_transaction")}
            accessibilityLabel={editingTransaction ? t("ledger_save_updates") : t("save_transaction")}
            disabled={recordMut.isPending || patchMut.isPending}
            style={styles.footerBtn}
          />
        </View>

          {recordMut.isPending || patchMut.isPending ? (
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
  sheetEditHint: { marginTop: 4, fontSize: 12, fontWeight: "800", letterSpacing: 0.2 },
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
  section: { marginTop: 14 },
  sectionHint: { fontSize: 12, fontWeight: "800", marginBottom: 8, letterSpacing: 0.2 },
  itemRow: { gap: 10, paddingVertical: 2 },
  itemChip: {
    minWidth: 84,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    gap: 6,
  },
  itemChipText: { fontWeight: "800", fontSize: 12 },
  dueRow: { flexDirection: "row", gap: 10 },
  dueTile: {
    flex: 1,
    minHeight: 84,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  dueDayNum: { fontSize: 26, fontWeight: "900", letterSpacing: -0.5 },
  dueResolved: { marginTop: 6, fontSize: 12, fontWeight: "700", textAlign: "center" },
  qrLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    marginTop: 12,
  },
  qrLinkText: { fontSize: 14, fontWeight: "900" },
  moreToggle: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "center",
    paddingVertical: 6,
  },
  moreToggleText: { fontSize: 13, fontWeight: "800" },
  moreSection: { marginTop: 8 },
  label: { fontSize: 12, fontWeight: "800", marginBottom: 6, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontWeight: "600",
    fontSize: 16,
  },
  noteRow: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  noteInput: { flex: 1, minHeight: 80, textAlignVertical: "top" },
  micHit: {
    width: 48,
    height: 52,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
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
