import { RecordSupplierSheet } from "@/components/record-supplier-sheet";
import { BigActionButton } from "@/components/ui/big-action-button";
import { MeshBackdrop } from "@/components/ui/mesh-backdrop";
import { MoneyDisplay } from "@/components/ui/money-display";
import { PersonAvatar } from "@/components/ui/person-avatar";
import { BakimateColors } from "@/constants/bakimate-theme";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { usePremiumRecordingAccess } from "@/lib/hooks/usePremiumRecordingAccess";
import { useShopCurrency } from "@/lib/hooks/useShopCurrency";
import { useSupplier } from "@/lib/hooks/useSuppliers";
import { formatMoneyMinor } from "@/lib/money";
import { useSessionStore } from "@/stores/session-store";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SupplierDetailScreen() {
  const { t, i18n } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const supplierId = Number(id);
  const token = useSessionStore((s) => s.token);

  const rawScheme = useColorScheme();
  const theme = rawScheme === "dark" ? "dark" : "light";
  const isDark = theme === "dark";
  const headline = Colors[theme].text;
  const muted = isDark ? BakimateColors.neutralTextMutedDark : BakimateColors.neutralText;

  const currency = useShopCurrency();
  const premiumRecording = usePremiumRecordingAccess(Boolean(token));

  const sq = useSupplier(supplierId, {
    enabled: Boolean(token) && Number.isFinite(supplierId) && supplierId > 0,
  });

  const [sheetMode, setSheetMode] = useState<"purchase" | "payment_out" | null>(null);

  const requirePremium = () => {
    const status = premiumRecording.data;
    if (premiumRecording.isLoading) return false;
    if (status?.requiresPremium === true && !status.entitled) {
      router.push("/paywall");
      return false;
    }
    return true;
  };

  const openSheet = (mode: "purchase" | "payment_out") => {
    if (!requirePremium()) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setSheetMode(mode);
  };

  if (!token) {
    return (
      <View style={styles.flex}>
        <MeshBackdrop isDark={isDark} />
        <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
          <Text style={{ color: headline, fontWeight: "700", padding: 20 }}>{t("sign_in_prompt")}</Text>
        </SafeAreaView>
      </View>
    );
  }

  if (!Number.isFinite(supplierId) || supplierId <= 0) {
    return (
      <View style={styles.flex}>
        <MeshBackdrop isDark={isDark} />
        <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
          <Text style={{ color: BakimateColors.danger, fontWeight: "800", padding: 20 }}>{t("error")}</Text>
        </SafeAreaView>
      </View>
    );
  }

  if (sq.isLoading) {
    return (
      <View style={styles.flex}>
        <MeshBackdrop isDark={isDark} />
        <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
          <ActivityIndicator color={BakimateColors.accentTeal} style={{ marginTop: 28 }} />
        </SafeAreaView>
      </View>
    );
  }

  const supplier = sq.data;
  if (sq.error || !supplier) {
    return (
      <View style={styles.flex}>
        <MeshBackdrop isDark={isDark} />
        <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
          <View style={{ padding: 20 }}>
            <Text style={{ color: BakimateColors.danger, fontWeight: "700" }}>
              {String(sq.error ?? t("error"))}
            </Text>
            <Pressable onPress={() => void sq.refetch()} style={{ marginTop: 16 }}>
              <Text style={{ color: BakimateColors.accentTeal, fontWeight: "800" }}>{t("retry")}</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const owes = supplier.balance_sen > 0;
  const recent = supplier.recent_transactions ?? [];

  return (
    <View style={styles.flex}>
      <MeshBackdrop isDark={isDark} />

      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={16}
            accessibilityRole="button"
            style={({ pressed }) => [styles.backHit, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Ionicons name="chevron-back" size={32} color={headline} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollPad}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.heroWrap}>
            <PersonAvatar name={supplier.name} size="lg" kind="supplier" />

            <Text style={[styles.heroName, { color: headline }]} numberOfLines={2}>
              {supplier.name}
            </Text>

            <View style={{ marginTop: 6, alignItems: "center" }}>
              <MoneyDisplay
                sen={supplier.balance_sen}
                currencyCode={currency}
                tone={owes ? "debt" : "paid"}
                size="huge"
                align="center"
              />
              <Text style={[styles.heroStatus, { color: owes ? BakimateColors.danger : BakimateColors.success }]}>
                {owes ? t("supplier_payable_label") : t("no_balance_hint")}
              </Text>
            </View>

            {supplier.phone ? (
              <View style={styles.metaRow}>
                <View style={styles.metaPill}>
                  <Ionicons name="call-outline" size={16} color={BakimateColors.accentTeal} />
                  <Text style={[styles.metaText, { color: headline }]} numberOfLines={1}>
                    {supplier.phone}
                  </Text>
                </View>
              </View>
            ) : null}
          </View>

          <View style={styles.actionRow}>
            <BigActionButton
              onPress={() => openSheet("purchase")}
              icon="cart"
              variant="danger"
              size="xl"
              label={t("supplier_new_purchase")}
              accessibilityLabel={t("supplier_new_purchase")}
              style={styles.actionBtn}
              disabled={Platform.OS !== "web" && premiumRecording.isLoading}
            />
            <BigActionButton
              onPress={() => openSheet("payment_out")}
              icon="cash"
              variant="success"
              size="xl"
              label={t("supplier_paid_them")}
              accessibilityLabel={t("supplier_paid_them")}
              style={styles.actionBtn}
              disabled={Platform.OS !== "web" && premiumRecording.isLoading}
            />
          </View>

          <Text style={[styles.sectionTitle, { color: headline }]}>{t("supplier_recent_tx")}</Text>

          {recent.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="document-outline" size={42} color={muted} />
              <Text style={[styles.emptyText, { color: muted }]}>{t("supplier_tx_empty")}</Text>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {recent.map((tx) => {
                const isPurchase = tx.type === "purchase";
                const accent = isPurchase ? BakimateColors.danger : BakimateColors.success;
                return (
                  <View
                    key={tx.id}
                    style={[
                      styles.txRow,
                      {
                        backgroundColor: isDark ? "rgba(15, 23, 42, 0.55)" : "rgba(255, 255, 255, 0.94)",
                        borderColor: isDark ? BakimateColors.glassBorderDark : BakimateColors.border,
                      },
                    ]}
                  >
                    <View style={[styles.txIcon, { backgroundColor: `${accent}1F` }]}>
                      <Ionicons name={isPurchase ? "cart" : "cash"} size={22} color={accent} />
                    </View>

                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[styles.txTitle, { color: headline }]} numberOfLines={1}>
                        {isPurchase ? t("supplier_tx_purchase") : t("supplier_tx_payment_out")}
                      </Text>
                      {tx.note ? (
                        <Text style={[styles.txNote, { color: muted }]} numberOfLines={2}>
                          {tx.note}
                        </Text>
                      ) : null}
                      {tx.created_at ? (
                        <Text style={[styles.txDate, { color: muted }]}>{tx.created_at.slice(0, 10)}</Text>
                      ) : null}
                    </View>

                    <Text style={[styles.txAmt, { color: accent }]}>
                      {isPurchase ? "+" : "−"}
                      {formatMoneyMinor(tx.amount_sen, currency, i18n.language)}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      <RecordSupplierSheet
        visible={sheetMode !== null}
        mode={sheetMode}
        supplier={supplier}
        currency={currency}
        isDark={isDark}
        onClose={() => setSheetMode(null)}
        onSaved={() => void sq.refetch()}
      />

      {sheetMode ? null : (
        <LinearGradient
          pointerEvents="none"
          colors={isDark ? ["transparent", "rgba(11,18,32,0.45)"] : ["transparent", "rgba(241,245,249,0.45)"]}
          style={styles.bottomFade}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: "transparent" },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingTop: 4,
    paddingBottom: 6,
  },
  backHit: { padding: 6 },

  scrollPad: { paddingHorizontal: 20, paddingBottom: 60, flexGrow: 1 },

  heroWrap: { alignItems: "center", paddingTop: 4, paddingBottom: 16 },
  heroName: { marginTop: 14, fontSize: 24, fontWeight: "900", textAlign: "center", letterSpacing: -0.4 },
  heroStatus: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.3,
    textTransform: "uppercase",
    textAlign: "center",
  },

  metaRow: {
    marginTop: 14,
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(46, 196, 182, 0.12)",
  },
  metaText: { fontSize: 13, fontWeight: "800" },

  actionRow: { flexDirection: "row", gap: 12, marginTop: 6, marginBottom: 22 },
  actionBtn: { flex: 1 },

  sectionTitle: { fontSize: 17, fontWeight: "900", marginBottom: 10 },

  emptyWrap: { alignItems: "center", paddingVertical: 40, gap: 10 },
  emptyText: { fontSize: 14, fontWeight: "800" },

  txRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
  },
  txIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  txTitle: { fontWeight: "900", fontSize: 15 },
  txNote: { marginTop: 4, fontSize: 12, fontWeight: "600" },
  txDate: { marginTop: 4, fontSize: 11, fontWeight: "700" },
  txAmt: { fontWeight: "900", fontSize: 15 },

  bottomFade: { position: "absolute", left: 0, right: 0, bottom: 0, height: 40 },
});
