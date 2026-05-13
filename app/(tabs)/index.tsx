import { MeshBackdrop } from "@/components/ui/mesh-backdrop";
import { MoneyDisplay } from "@/components/ui/money-display";
import { PersonRow } from "@/components/ui/person-row";
import { SignInHero } from "@/components/ui/sign-in-hero";
import { BakimateColors } from "@/constants/bakimate-theme";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useReportSummary } from "@/lib/hooks/useReportSummary";
import { useShopCurrency } from "@/lib/hooks/useShopCurrency";
import { profileToReceiptBlurb, resolveShopProfile } from "@/lib/shop-profile";
import { buildSmartCollectionWhatsAppMessage } from "@/lib/smart-collection-message";
import { openWhatsAppText } from "@/lib/whatsapp";
import { useSessionStore } from "@/stores/session-store";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const TAB_PAD = Platform.OS === "ios" ? 108 : 96;

export default function HomeScreen() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const theme = colorScheme === "dark" ? "dark" : "light";
  const isDark = theme === "dark";
  const token = useSessionStore((s) => s.token);
  const shopProfiles = useSessionStore((s) => s.shopProfiles);
  const user = useSessionStore((s) => s.user);

  const summaryQ = useReportSummary({ enabled: Boolean(token) });
  const s = summaryQ.data;

  const shopLocal = resolveShopProfile(shopProfiles, user?.id);
  const currency = useShopCurrency();

  const headline = Colors[theme].text;
  const muted = isDark ? BakimateColors.neutralTextMutedDark : BakimateColors.neutralText;

  const nudge = (row: { id: number; name: string; balance_sen: number; phone: string | null }) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const msg = buildSmartCollectionWhatsAppMessage(
      row.name,
      row.balance_sen,
      profileToReceiptBlurb(shopLocal),
    );
    void openWhatsAppText(msg, row.phone).catch(() => {
      Alert.alert(t("share_failed_title"), t("whatsapp_unavailable"));
    });
  };

  return (
    <View style={styles.root}>
      <MeshBackdrop isDark={isDark} />

      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ScrollView
          refreshControl={
            token ? (
              <RefreshControl
                refreshing={summaryQ.isRefetching}
                onRefresh={() => void summaryQ.refetch()}
                tintColor={BakimateColors.accentTeal}
              />
            ) : undefined
          }
          contentContainerStyle={[styles.scroll, { paddingBottom: TAB_PAD + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Title row */}
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.brand, { color: headline }]}>{t("app_name")}</Text>
              <Text style={[styles.tag, { color: muted }]}>{t("home_tagline")}</Text>
            </View>
            <View style={[styles.currencyChip, { backgroundColor: BakimateColors.accentTeal + "22" }]}>
              <Text style={[styles.currencyChipText, { color: BakimateColors.accentTeal }]}>{currency}</Text>
            </View>
          </View>

          {!token ? (
            <SignInHero isDark={isDark} />
          ) : summaryQ.isLoading ? (
            <ActivityIndicator style={{ marginTop: 36 }} color={BakimateColors.accentTeal} />
          ) : summaryQ.error ? (
            <Text style={{ color: BakimateColors.danger, marginTop: 12 }}>
              {(summaryQ.error as Error).message ?? String(summaryQ.error)}
            </Text>
          ) : s ? (
            <>
              {/* KPI: money in the market (red) */}
              <View
                style={[
                  styles.kpiCard,
                  {
                    backgroundColor: isDark ? "rgba(222, 53, 11, 0.15)" : "rgba(222, 53, 11, 0.08)",
                    borderColor: BakimateColors.danger + "55",
                  },
                ]}
              >
                <View style={[styles.kpiIconWrap, { backgroundColor: BakimateColors.danger + "26" }]}>
                  <Ionicons name="arrow-up" size={28} color={BakimateColors.danger} />
                </View>
                <View style={styles.kpiBody}>
                  <MoneyDisplay sen={s.total_outstanding_sen} currencyCode={currency} tone="debt" size="huge" />
                  <Text style={[styles.kpiCaption, { color: muted }]} numberOfLines={1}>
                    {t("dash_total_outstanding")}
                  </Text>
                </View>
              </View>

              {/* KPI: collected today (green) */}
              <View
                style={[
                  styles.kpiCard,
                  {
                    backgroundColor: isDark ? "rgba(54, 179, 126, 0.15)" : "rgba(54, 179, 126, 0.08)",
                    borderColor: BakimateColors.success + "55",
                  },
                ]}
              >
                <View style={[styles.kpiIconWrap, { backgroundColor: BakimateColors.success + "26" }]}>
                  <Ionicons name="arrow-down" size={28} color={BakimateColors.success} />
                </View>
                <View style={styles.kpiBody}>
                  <MoneyDisplay sen={s.today.payments_collected_sen} currencyCode={currency} tone="paid" size="huge" />
                  <Text style={[styles.kpiCaption, { color: muted }]} numberOfLines={1}>
                    {t("dash_today_collected")}
                  </Text>
                </View>
              </View>

              {/* BakiScore mood */}
              {(() => {
                const bk = s.bakiscore ?? { score: 100, tier: "strong" as const, label: "", avg_risk: 0 };
                const face =
                  bk.tier === "strong"
                    ? "happy-outline"
                    : bk.tier === "watch"
                      ? "ellipse-outline"
                      : "sad-outline";
                const faceColor =
                  bk.tier === "strong"
                    ? BakimateColors.success
                    : bk.tier === "watch"
                      ? "#FBBF24"
                      : BakimateColors.danger;
                const filled = bk.tier === "strong" ? 5 : bk.tier === "watch" ? 3 : 1;
                return (
                  <View style={[styles.scoreCard, { borderColor: faceColor + "44" }]}>
                    <Ionicons name={face} size={48} color={faceColor} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={styles.starRow}>
                        {Array.from({ length: 5 }, (_, i) => (
                          <Ionicons
                            key={i}
                            name={i < filled ? "star" : "star-outline"}
                            size={20}
                            color={i < filled ? "#FBBF24" : muted + "66"}
                            style={{ marginRight: 3 }}
                          />
                        ))}
                      </View>
                      <Text style={[styles.scoreCaption, { color: muted }]} numberOfLines={2}>
                        {bk.label || t("home_baki_default_meta")}
                      </Text>
                    </View>
                  </View>
                );
              })()}

              {/* Priority list */}
              <View style={styles.prioritySection}>
                <View style={styles.priorityHead}>
                  <Ionicons name="alert-circle-outline" size={22} color={BakimateColors.accentTeal} />
                  <Text style={[styles.priorityTitle, { color: headline }]}>{t("dash_priority_title")}</Text>
                </View>

                {(s.priority_customers ?? []).length === 0 ? (
                  <View style={[styles.emptyWrap, { backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.65)" }]}>
                    <Ionicons name="checkmark-circle" size={36} color={BakimateColors.success} />
                    <Text style={[styles.emptyText, { color: muted }]}>{t("dash_priority_empty")}</Text>
                  </View>
                ) : (
                  (s.priority_customers ?? []).map((row) => (
                    <PersonRow
                      key={row.id}
                      id={row.id}
                      name={row.name}
                      balanceSen={row.balance_sen}
                      currencyCode={currency}
                      isDark={isDark}
                      kind="customer"
                      onPress={() => router.push(`/customer/${row.id}`)}
                      subline={
                        typeof row.days_overdue === "number"
                          ? t("dash_days_overdue", { count: row.days_overdue })
                          : undefined
                      }
                      sublineTone={typeof row.days_overdue === "number" ? "danger" : "muted"}
                      trailingAction={
                        <Pressable
                          onPress={() => nudge(row)}
                          accessibilityRole="button"
                          accessibilityLabel={t("remind_whatsapp")}
                          style={({ pressed }) => [
                            styles.nudgeBtn,
                            { backgroundColor: "#25D366", opacity: pressed ? 0.85 : 1 },
                          ]}
                          hitSlop={8}
                        >
                          <Ionicons name="logo-whatsapp" size={22} color="#fff" />
                        </Pressable>
                      }
                    />
                  ))
                )}
              </View>
            </>
          ) : null}

          {/* Quick bottom row */}
          <View style={styles.quickRow}>
            <Pressable
              style={({ pressed }) => [styles.pillPrimary, { opacity: pressed ? 0.9 : 1 }]}
              onPress={() => router.push("/customers")}
            >
              <Ionicons name="people" size={20} color="#fff" />
              <Text style={styles.pillText}>{t("tab_customers")}</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.pillGlass, { opacity: pressed ? 0.88 : 1 }]}
              onPress={() => router.push("/paywall")}
            >
              <Ionicons name="diamond-outline" size={20} color={BakimateColors.accentTeal} />
              <Text style={[styles.pillGlassText, { color: BakimateColors.accentTeal }]}>
                {t("paywall_title")}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1, backgroundColor: "transparent" },
  scroll: { paddingHorizontal: 20 },

  titleRow: { flexDirection: "row", alignItems: "flex-start", marginTop: 4, marginBottom: 14, gap: 10 },
  brand: { fontSize: 32, fontWeight: "900", letterSpacing: -1 },
  tag: { marginTop: 4, fontSize: 13, fontWeight: "700", lineHeight: 18 },
  currencyChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  currencyChipText: { fontSize: 13, fontWeight: "900", letterSpacing: 0.6 },

  kpiCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    borderRadius: 24,
    borderWidth: 1.5,
    paddingVertical: 18,
    paddingHorizontal: 18,
    marginBottom: 12,
  },
  kpiIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  kpiBody: { flex: 1, minWidth: 0 },
  kpiCaption: { marginTop: 4, fontSize: 12, fontWeight: "800", letterSpacing: 0.4 },

  scoreCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 22,
    borderWidth: 1.5,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: 4,
    marginBottom: 18,
    backgroundColor: "rgba(0,0,0,0.03)",
  },
  starRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  scoreCaption: { fontSize: 12, fontWeight: "700", lineHeight: 17 },

  prioritySection: { marginTop: 4 },
  priorityHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  priorityTitle: { fontSize: 18, fontWeight: "900", letterSpacing: -0.3 },

  emptyWrap: {
    alignItems: "center",
    paddingVertical: 28,
    paddingHorizontal: 18,
    borderRadius: 20,
    gap: 10,
  },
  emptyText: { fontSize: 13, fontWeight: "800", textAlign: "center" },

  nudgeBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 4,
  },

  quickRow: { flexDirection: "row", gap: 12, marginTop: 18 },
  pillPrimary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 20,
    backgroundColor: BakimateColors.primary,
    ...Platform.select({
      ios: {
        shadowColor: BakimateColors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.32,
        shadowRadius: 14,
      },
      android: { elevation: 6 },
      default: {},
    }),
  },
  pillGlass: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: BakimateColors.accentTeal + "70",
    backgroundColor: "rgba(46, 196, 182, 0.12)",
  },
  pillText: { color: "#fff", fontWeight: "900", fontSize: 15 },
  pillGlassText: { fontWeight: "900", fontSize: 15 },
});
