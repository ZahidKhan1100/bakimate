import { PickCustomerSheet } from "@/components/pick-customer-sheet";
import { BigActionButton } from "@/components/ui/big-action-button";
import { GlassSurface } from "@/components/ui/glass-surface";
import { MeshBackdrop } from "@/components/ui/mesh-backdrop";
import { MoneyDisplay } from "@/components/ui/money-display";
import { PriorityCustomerRow } from "@/components/priority-customer-row";
import { ScreenHeroHeader } from "@/components/ui/screen-hero-header";
import { SignInHero } from "@/components/ui/sign-in-hero";
import { BakimateColors } from "@/constants/bakimate-theme";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { presentRewardedAdGate } from "@/lib/ads/rewarded-ad-gate";
import { MONETIZATION_ENABLED } from "@/lib/monetization";
import { usePremiumRecordingAccess } from "@/lib/hooks/usePremiumRecordingAccess";
import { usePullToRefresh } from "@/lib/hooks/usePullToRefresh";
import { useReportSummary } from "@/lib/hooks/useReportSummary";
import { useShopCurrency } from "@/lib/hooks/useShopCurrency";
import { profileToReceiptBlurb, resolveShopProfile } from "@/lib/shop-profile";
import { buildSmartCollectionWhatsAppMessage } from "@/lib/smart-collection-message";
import { openWhatsAppText } from "@/lib/whatsapp";
import { useSessionStore } from "@/stores/session-store";
import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Text } from "@/components/ui/text";
import { SafeAreaView } from "react-native-safe-area-context";

/** Scroll clears the floating tab bar; height comes from the navigator after safe-area tweak. */

export default function HomeScreen() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const theme = colorScheme === "dark" ? "dark" : "light";
  const isDark = theme === "dark";
  const token = useSessionStore((s) => s.token);
  const shopProfiles = useSessionStore((s) => s.shopProfiles);
  const user = useSessionStore((s) => s.user);

  const summaryQ = useReportSummary({ enabled: Boolean(token) });
  const premiumRecording = usePremiumRecordingAccess(Boolean(token));
  const pullRefresh = usePullToRefresh(() => summaryQ.refetch());
  const s = summaryQ.data;

  const shopLocal = resolveShopProfile(shopProfiles, user?.id);
  const currency = useShopCurrency();

  const tabBarHeight = useBottomTabBarHeight();
  const [pickMode, setPickMode] = useState<"credit" | "payment" | null>(null);

  const headline = Colors[theme].text;
  const muted = isDark ? BakimateColors.neutralTextMutedDark : BakimateColors.neutralText;
  const dividerLine = isDark ? "rgba(148, 163, 184, 0.22)" : "rgba(15, 23, 42, 0.1)";

  const nudge = (row: { id: number; name: string; balance_sen: number; phone: string | null }) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const msg = buildSmartCollectionWhatsAppMessage(
      row.name,
      row.balance_sen,
      profileToReceiptBlurb(shopLocal),
    );
    void presentRewardedAdGate(premiumRecording.data)
      .then(() => openWhatsAppText(msg, row.phone))
      .catch(() => {
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
                refreshing={pullRefresh.refreshing}
                onRefresh={pullRefresh.onRefresh}
                tintColor={BakimateColors.accentTeal}
              />
            ) : undefined
          }
          contentContainerStyle={[styles.scroll, { paddingBottom: tabBarHeight + 28 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Premium header */}
          <ScreenHeroHeader
            variant="home"
            eyebrow={token ? t("home_eyebrow") : undefined}
            title={t("app_name")}
            subtitle={t("home_tagline")}
            headlineColor={headline}
            mutedColor={muted}
            marginBottom={8}
            trailing={
              <View
                style={[
                  styles.currencyChip,
                  {
                    backgroundColor: isDark ? "rgba(46, 196, 182, 0.12)" : "rgba(0, 135, 90, 0.08)",
                    borderColor: isDark ? BakimateColors.accentTeal + "44" : BakimateColors.primary + "33",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.currencyChipText,
                    { color: isDark ? BakimateColors.accentTeal : BakimateColors.primary },
                  ]}
                >
                  {currency}
                </Text>
              </View>
            }
          />

          {!token ? (
            <SignInHero isDark={isDark} />
          ) : summaryQ.isLoading ? (
            <ActivityIndicator style={{ marginTop: 40 }} color={BakimateColors.accentTeal} />
          ) : summaryQ.error && !s ? (
            <Text style={{ color: BakimateColors.danger, marginTop: 16 }}>{(summaryQ.error as Error).message ?? String(summaryQ.error)}</Text>
          ) : s ? (
            <>
              {/* Dual-stat glass card */}
              <GlassSurface
                isDark={isDark}
                style={styles.statsGlass}
                contentStyle={styles.statsGlassInner}
              >
                <View style={styles.statsRow}>
                  <View style={styles.statCol}>
                    <View style={[styles.statIconRing, { borderColor: BakimateColors.danger + "55" }]}>
                      <Ionicons name="trending-up" size={20} color={BakimateColors.danger} />
                    </View>
                    <MoneyDisplay sen={s.total_outstanding_sen} currencyCode={currency} tone="debt" size="large" />
                    <Text style={[styles.statLabel, { color: muted }]} numberOfLines={2}>
                      {t("dash_total_outstanding")}
                    </Text>
                  </View>

                  <View style={[styles.statDivider, { backgroundColor: dividerLine }]} />

                  <View style={styles.statCol}>
                    <View style={[styles.statIconRing, { borderColor: BakimateColors.success + "55" }]}>
                      <Ionicons name="cash-outline" size={20} color={BakimateColors.success} />
                    </View>
                    <MoneyDisplay sen={s.today.payments_collected_sen} currencyCode={currency} tone="paid" size="large" />
                    <Text style={[styles.statLabel, { color: muted }]} numberOfLines={2}>
                      {t("dash_today_collected")}
                    </Text>
                  </View>
                </View>
              </GlassSurface>

              {/* Record shortcuts: pick a customer, then land in their record sheet */}
              <View style={styles.recordRow}>
                <BigActionButton
                  onPress={() => setPickMode("credit")}
                  icon="arrow-up"
                  variant="danger"
                  size="xl"
                  label={t("quick_gave")}
                  style={styles.recordBtn}
                />
                <BigActionButton
                  onPress={() => setPickMode("payment")}
                  icon="arrow-down"
                  variant="success"
                  size="xl"
                  label={t("quick_got")}
                  style={styles.recordBtn}
                />
              </View>

              {/* BakiScore — frosted + accent stripe */}
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
                  <GlassSurface isDark={isDark} style={styles.scoreGlass} contentStyle={styles.scoreGlassInner}>
                    <LinearGradient
                      colors={[faceColor + "99", faceColor + "18"]}
                      start={{ x: 0, y: 0.5 }}
                      end={{ x: 0, y: 1 }}
                      style={styles.scoreStripe}
                    />
                    <View style={styles.scoreMain}>
                      <View style={[styles.scoreIconBubble, { backgroundColor: faceColor + "18" }]}>
                        <Ionicons name={face} size={40} color={faceColor} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={[styles.scoreTitle, { color: headline }]}>{t("bakiscore_title")}</Text>
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
                  </GlassSurface>
                );
              })()}

              {/* Priority — call today */}
              <View style={styles.priorityHeader}>
                <View style={styles.priorityHeaderLeft}>
                  <View
                    style={[
                      styles.priorityHeaderIcon,
                      {
                        backgroundColor: isDark ? "rgba(251, 146, 60, 0.15)" : "rgba(234, 88, 12, 0.12)",
                        borderColor: isDark ? "rgba(251, 146, 60, 0.35)" : "rgba(234, 88, 12, 0.28)",
                      },
                    ]}
                  >
                    <Ionicons name="call" size={16} color={isDark ? "#FB923C" : BakimateColors.danger} />
                  </View>
                  <Text style={[styles.priorityHeaderTitle, { color: headline }]}>
                    {t("dash_priority_title")}
                  </Text>
                </View>
                {(s.priority_customers ?? []).length > 0 ? (
                  <View
                    style={[
                      styles.priorityCountBadge,
                      {
                        backgroundColor: isDark ? "rgba(251, 146, 60, 0.2)" : "rgba(234, 88, 12, 0.12)",
                        borderColor: isDark ? "rgba(251, 146, 60, 0.4)" : "rgba(234, 88, 12, 0.3)",
                      },
                    ]}
                  >
                    <Text style={[styles.priorityCountText, { color: isDark ? "#FB923C" : BakimateColors.danger }]}>
                      {(s.priority_customers ?? []).length}
                    </Text>
                  </View>
                ) : null}
              </View>
              <GlassSurface
                isDark={isDark}
                style={[
                  styles.priorityGlass,
                  {
                    borderColor: isDark ? "rgba(251, 146, 60, 0.22)" : "rgba(234, 88, 12, 0.18)",
                  },
                ]}
                contentStyle={styles.priorityGlassInner}
              >
                {(s.priority_customers ?? []).length === 0 ? (
                  <View style={[styles.emptyWrap, { backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.5)" }]}>
                    <Ionicons name="checkmark-circle" size={40} color={BakimateColors.success} />
                    <Text style={[styles.emptyText, { color: muted }]}>{t("dash_priority_empty")}</Text>
                  </View>
                ) : (
                  <View>
                    {(s.priority_customers ?? []).map((row, index, arr) => (
                      <PriorityCustomerRow
                        key={row.id}
                        id={row.id}
                        name={row.name}
                        balanceSen={row.balance_sen}
                        currencyCode={currency}
                        isDark={isDark}
                        isLast={index === arr.length - 1}
                        overdueLabel={
                          typeof row.days_overdue === "number"
                            ? t("dash_days_overdue", { count: row.days_overdue })
                            : undefined
                        }
                        onPress={() => router.push(`/customer/${row.id}`)}
                        onWhatsApp={() => nudge(row)}
                      />
                    ))}
                  </View>
                )}
              </GlassSurface>

              {/* Quick actions */}
              <View style={styles.quickRow}>
                <Pressable
                  style={({ pressed }) => [styles.pillPrimary, { opacity: pressed ? 0.92 : 1 }]}
                  onPress={() => router.push("/insights")}
                >
                  <LinearGradient
                    colors={[BakimateColors.primary, "#006848"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.pillPrimaryFill}
                  >
                    <Ionicons name="bar-chart" size={22} color="#fff" />
                    <Text style={styles.pillText}>{t("home_weekly_report")}</Text>
                  </LinearGradient>
                </Pressable>

                {MONETIZATION_ENABLED ? (
                <Pressable
                  style={({ pressed }) => [styles.pillGlass, { opacity: pressed ? 0.9 : 1 }]}
                  onPress={() => router.push("/paywall")}
                >
                  <LinearGradient
                    colors={
                      isDark
                        ? ["rgba(46, 196, 182, 0.2)", "rgba(0, 135, 90, 0.12)"]
                        : ["rgba(255, 255, 255, 0.95)", "rgba(46, 196, 182, 0.12)"]
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.pillGlassFill}
                  >
                    <Ionicons name="diamond" size={22} color={BakimateColors.accentTeal} />
                    <Text style={[styles.pillGlassText, { color: BakimateColors.accentTeal }]}>{t("paywall_title")}</Text>
                  </LinearGradient>
                </Pressable>
                ) : null}
              </View>
            </>
          ) : null}
        </ScrollView>
      </SafeAreaView>

      <PickCustomerSheet
        mode={pickMode}
        isDark={isDark}
        onClose={() => setPickMode(null)}
        onPick={(customerId, mode) => {
          setPickMode(null);
          router.push({ pathname: "/customer/[id]", params: { id: String(customerId), record: mode } });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1, backgroundColor: "transparent" },
  scroll: { paddingHorizontal: 20 },

  currencyChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  currencyChipText: { fontSize: 14, fontWeight: "900", letterSpacing: 1.2 },

  statsGlass: { marginBottom: 18 },
  statsGlassInner: { padding: 20 },
  statsRow: { flexDirection: "row", alignItems: "stretch" },
  statCol: { flex: 1, minWidth: 0, gap: 8, alignItems: "flex-start" },
  statIconRing: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  statDivider: { width: StyleSheet.hairlineWidth, marginHorizontal: 4 },
  statLabel: { fontSize: 13, fontWeight: "800", letterSpacing: 0.35, lineHeight: 15 },

  recordRow: { flexDirection: "row", gap: 12, marginBottom: 18 },
  recordBtn: { flex: 1 },

  scoreGlass: { marginBottom: 20 },
  scoreGlassInner: { paddingVertical: 18, paddingHorizontal: 18, paddingLeft: 22, position: "relative", overflow: "hidden" },
  scoreStripe: {
    position: "absolute",
    left: 0,
    top: 12,
    bottom: 12,
    width: 5,
    borderRadius: 4,
  },
  scoreMain: { flexDirection: "row", alignItems: "center", gap: 16 },
  scoreIconBubble: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreTitle: { fontSize: 13, fontWeight: "900", letterSpacing: -0.2, marginBottom: 6 },
  starRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  scoreCaption: { fontSize: 13, fontWeight: "700", lineHeight: 18 },

  sectionLabel: {
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 10,
    marginTop: 4,
  },

  priorityHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    marginTop: 4,
  },
  priorityHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1, minWidth: 0 },
  priorityHeaderIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  priorityHeaderTitle: { fontSize: 17, fontWeight: "900", letterSpacing: -0.3 },
  priorityCountBadge: {
    minWidth: 28,
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  priorityCountText: { fontSize: 14, fontWeight: "900" },
  priorityGlass: { marginBottom: 6 },
  priorityGlassInner: { paddingHorizontal: 14, paddingVertical: 4 },

  emptyWrap: {
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 16,
    borderRadius: 18,
    gap: 12,
  },
  emptyText: { fontSize: 14, fontWeight: "800", textAlign: "center", lineHeight: 20 },


  quickRow: { flexDirection: "row", gap: 12, marginTop: 22 },
  pillPrimary: {
    flex: 1,
    borderRadius: 22,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: BakimateColors.primary,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.35,
        shadowRadius: 18,
      },
      android: { elevation: 8 },
      default: {},
    }),
  },
  pillPrimaryFill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 17,
  },
  pillGlass: {
    flex: 1,
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: BakimateColors.accentTeal + "55",
    ...Platform.select({
      ios: {
        shadowColor: "#0f172a",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
      },
      android: { elevation: 4 },
      default: {},
    }),
  },
  pillGlassFill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
  },
  pillText: { color: "#fff", fontWeight: "900", fontSize: 16, letterSpacing: -0.2 },
  pillGlassText: { fontWeight: "900", fontSize: 16, letterSpacing: -0.2 },
});
