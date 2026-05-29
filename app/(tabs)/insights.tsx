import { GlassSurface } from "@/components/ui/glass-surface";
import { MeshBackdrop } from "@/components/ui/mesh-backdrop";
import { MoneyDisplay } from "@/components/ui/money-display";
import { PersonAvatar } from "@/components/ui/person-avatar";
import { PersonRow } from "@/components/ui/person-row";
import { ScreenHeroHeader } from "@/components/ui/screen-hero-header";
import { SignInHero } from "@/components/ui/sign-in-hero";
import { BakimateColors } from "@/constants/bakimate-theme";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { formatChartWeekdayLabel } from "@/lib/format-dates";
import { useInsights } from "@/lib/hooks/useInsights";
import { usePremiumRecordingAccess } from "@/lib/hooks/usePremiumRecordingAccess";
import { useShopCurrency } from "@/lib/hooks/useShopCurrency";
import { formatMoneyMinor } from "@/lib/money";
import { apiErrorMessage } from "@/lib/api";
import { buildWeeklyNudgeWhatsAppMessage } from "@/lib/nudge-whatsapp";
import { shareMonthlyStatementPdf } from "@/lib/pdf-download";
import { iconForQuickItem } from "@/lib/quick-item-icons";
import type { InsightsWeekCashflowDay } from "@/lib/reports-api";
import { profileToReceiptBlurb, resolveShopProfile } from "@/lib/shop-profile";
import { openWhatsAppText } from "@/lib/whatsapp";
import { useSessionStore } from "@/stores/session-store";
import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useMemo, useState } from "react";
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

function CashflowBars({
  days,
  labelColor,
  language,
}: {
  days: InsightsWeekCashflowDay[];
  labelColor: string;
  language: string;
}) {
  const maxSen = Math.max(
    ...days.flatMap((d) => [d.payments_collected_sen ?? 0, d.credit_given_sen ?? 0]),
    1,
  );
  const chartH = 88;
  const minVis = 3;

  return (
    <View style={styles.chartRow}>
      {days.map((d) => {
        const paySen = d.payments_collected_sen ?? 0;
        const credSen = d.credit_given_sen ?? 0;
        const gh = maxSen <= 0 ? 0 : (chartH * paySen) / maxSen;
        const rh = maxSen <= 0 ? 0 : (chartH * credSen) / maxSen;
        const gVis = paySen <= 0 ? 0 : Math.max(gh, minVis);
        const rVis = credSen <= 0 ? 0 : Math.max(rh, minVis);

        return (
          <View key={d.date} style={styles.barCol}>
            <View style={[styles.dayBars, { height: chartH }]}>
              <View style={styles.barSlot}>
                <View style={[styles.collectBar, { height: gVis }]} />
              </View>
              <View style={styles.barSlot}>
                <View style={[styles.creditBar, { height: rVis }]} />
              </View>
            </View>
            <Text style={[styles.barDay, { color: labelColor }]} numberOfLines={1}>
              {formatChartWeekdayLabel(d.date, language)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export default function InsightsScreen() {
  const { t, i18n } = useTranslation();
  const tabBarHeight = useBottomTabBarHeight();
  const shopCurrency = useShopCurrency();
  const rawScheme = useColorScheme();
  const theme = rawScheme === "dark" ? "dark" : "light";
  const isDark = theme === "dark";
  const headline = Colors[theme].text;
  const muted = isDark ? BakimateColors.neutralTextMutedDark : BakimateColors.neutralText;

  const token = useSessionStore((s) => s.token);
  const user = useSessionStore((s) => s.user);
  const shopProfiles = useSessionStore((s) => s.shopProfiles);

  const iq = useInsights();
  const premiumRecording = usePremiumRecordingAccess(Boolean(token));

  const monthYyyyMm = useMemo(() => new Date().toISOString().slice(0, 7), []);
  const [monthPdfBusy, setMonthPdfBusy] = useState(false);
  const [pulseExpanded, setPulseExpanded] = useState(false);

  const weekTotals = useMemo(() => {
    const days = iq.data?.week_cashflow ?? [];
    return days.reduce(
      (acc, d) => ({
        collected: acc.collected + (d.payments_collected_sen ?? 0),
        credit: acc.credit + (d.credit_given_sen ?? 0),
      }),
      { collected: 0, credit: 0 },
    );
  }, [iq.data?.week_cashflow]);

  const blurb = profileToReceiptBlurb(resolveShopProfile(shopProfiles, user?.id));

  const onNudgeWa = async (name: string, phone: string | null, balanceSen: number) => {
    try {
      const msg = buildWeeklyNudgeWhatsAppMessage(name, balanceSen, blurb);
      await openWhatsAppText(msg, phone);
    } catch {
      Alert.alert(t("share_failed_title"), t("whatsapp_unavailable"));
    }
  };

  const onSharePdf = () => {
    const ok = premiumRecording.data;
    if (premiumRecording.isLoading) return;
    if (ok?.requiresPremium === true && !ok.entitled) {
      router.push("/paywall");
      return;
    }
    if (Platform.OS === "web") {
      Alert.alert(t("error"), t("insights_monthly_pdf_web"));
      return;
    }
    setMonthPdfBusy(true);
    void shareMonthlyStatementPdf(monthYyyyMm)
      .catch((e: unknown) => {
        Alert.alert(t("error"), e instanceof Error ? e.message : String(e));
      })
      .finally(() => setMonthPdfBusy(false));
  };

  return (
    <View style={styles.root}>
      <MeshBackdrop isDark={isDark} />

      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ScrollView
          refreshControl={
            token ? (
              <RefreshControl
                refreshing={iq.isRefetching}
                onRefresh={() => void iq.refetch()}
                tintColor={BakimateColors.accentTeal}
              />
            ) : undefined
          }
          contentContainerStyle={[styles.scroll, { paddingBottom: tabBarHeight + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          <ScreenHeroHeader
            eyebrow={t("insights_this_week_title")}
            title={t("insights_title")}
            subtitle={t("insights_subtitle")}
            headlineColor={headline}
            mutedColor={muted}
            marginBottom={6}
          />

          {!token ? (
            <SignInHero isDark={isDark} />
          ) : iq.isLoading ? (
            <ActivityIndicator style={{ marginTop: 36 }} color={BakimateColors.accentTeal} />
          ) : iq.error && !iq.data ? (
            <Text style={{ color: BakimateColors.danger, marginTop: 14, fontWeight: "700" }}>
              {apiErrorMessage(iq.error)}
            </Text>
          ) : iq.data ? (
            <>
              <GlassSurface isDark={isDark} style={styles.summaryGlass} contentStyle={styles.summaryGlassInner}>
                <View style={styles.summaryRow}>
                  <View
                    style={[
                      styles.summaryTile,
                      {
                        backgroundColor: isDark
                          ? "rgba(34, 197, 94, 0.18)"
                          : "rgba(34, 197, 94, 0.14)",
                        borderColor: BakimateColors.success,
                      },
                      styles.summaryTileLeading,
                    ]}
                  >
                    <Ionicons name="cash" size={32} color={BakimateColors.success} />
                    <MoneyDisplay
                      sen={weekTotals.collected}
                      currencyCode={shopCurrency}
                      size="large"
                      tone="paid"
                      align="center"
                    />
                    <Text style={[styles.summaryCaption, { color: BakimateColors.success }]}>
                      {t("insights_legend_collected")}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.summaryTile,
                      {
                        backgroundColor: isDark
                          ? "rgba(239, 68, 68, 0.18)"
                          : "rgba(239, 68, 68, 0.12)",
                        borderColor: BakimateColors.danger,
                      },
                    ]}
                  >
                    <Ionicons name="arrow-up" size={32} color={BakimateColors.danger} />
                    <MoneyDisplay
                      sen={weekTotals.credit}
                      currencyCode={shopCurrency}
                      size="large"
                      tone="debt"
                      align="center"
                    />
                    <Text style={[styles.summaryCaption, { color: BakimateColors.danger }]}>
                      {t("insights_legend_credit")}
                    </Text>
                  </View>
                </View>
              </GlassSurface>

              <GlassSurface isDark={isDark} style={styles.chartGlass} contentStyle={styles.cardPad}>
                <View style={styles.legendRow}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendSwatch, { backgroundColor: BakimateColors.success }]} />
                    <Text style={[styles.legendText, { color: muted }]}>{t("insights_legend_collected")}</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendSwatch, { backgroundColor: BakimateColors.danger }]} />
                    <Text style={[styles.legendText, { color: muted }]}>{t("insights_legend_credit")}</Text>
                  </View>
                </View>
                <CashflowBars
                  days={iq.data.week_cashflow}
                  labelColor={muted}
                  language={i18n.language}
                />
              </GlassSurface>

              {/* Top debtors */}
              <View style={styles.sectionTitleRow}>
                <Ionicons name="people" size={22} color={BakimateColors.danger} />
                <Text style={[styles.sectionTitle, { color: headline }]}>
                  {t("insights_top_debtors_title")}
                </Text>
              </View>
              {iq.data.top_debtors.length === 0 ? (
                <Text style={[styles.emptyInline, { color: muted }]}>
                  {t("insights_top_debtors_empty")}
                </Text>
              ) : (
                iq.data.top_debtors.slice(0, 5).map((row) => (
                  <PersonRow
                    key={row.id}
                    id={row.id}
                    name={row.name}
                    balanceSen={row.balance_sen}
                    currencyCode={shopCurrency}
                    isDark={isDark}
                    kind="customer"
                    onPress={() => router.push(`/customer/${row.id}`)}
                  />
                ))
              )}

              {/* Weekly nudges */}
              <View style={styles.sectionTitleRow}>
                <Ionicons name="notifications" size={22} color="#FBBF24" />
                <Text style={[styles.sectionTitle, { color: headline }]}>
                  {t("insights_weekly_nudges_title")}
                </Text>
              </View>
              {iq.data.weekly_nudges.length === 0 ? (
                <Text style={[styles.emptyInline, { color: muted }]}>
                  {t("insights_weekly_nudges_empty")}
                </Text>
              ) : (
                iq.data.weekly_nudges.map((n) => (
                  <PersonRow
                    key={n.id}
                    id={n.id}
                    name={n.name}
                    balanceSen={n.balance_sen}
                    currencyCode={shopCurrency}
                    isDark={isDark}
                    kind="customer"
                    onPress={() => router.push(`/customer/${n.id}`)}
                    subline={
                      typeof n.days_since_payment === "number"
                        ? t("insights_days_since_payment", { count: n.days_since_payment })
                        : t("insights_no_payment_history")
                    }
                    sublineTone="danger"
                    trailingAction={
                      <Pressable
                        onPress={() => {
                          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                          void onNudgeWa(n.name, n.phone, n.balance_sen);
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={t("insights_whatsapp_nudge")}
                        style={({ pressed }) => [
                          styles.waBtn,
                          { opacity: pressed ? 0.88 : 1 },
                        ]}
                      >
                        <Ionicons name="logo-whatsapp" size={26} color="#fff" />
                      </Pressable>
                    }
                  />
                ))
              )}

              {/* Quick item pulse — pictograms */}
              {(iq.data.credit_item_pulse ?? []).length > 0 ? (
                <>
                  <View style={styles.sectionTitleRow}>
                    <Ionicons name="cube" size={22} color={BakimateColors.accentTeal} />
                    <Text style={[styles.sectionTitle, { color: headline }]}>
                      {t("insights_quick_item_pulse_title")}
                    </Text>
                  </View>
                  <View style={{ gap: 10 }}>
                    {iq.data.credit_item_pulse!.map((row) => (
                      <View
                        key={row.item_key}
                        style={[
                          styles.quickRow,
                          {
                            backgroundColor: isDark
                              ? "rgba(15, 23, 42, 0.55)"
                              : "rgba(255, 255, 255, 0.94)",
                            borderColor: isDark
                              ? BakimateColors.glassBorderDark
                              : BakimateColors.border,
                          },
                        ]}
                      >
                        <View style={[styles.quickIcon, { backgroundColor: "rgba(46,196,182,0.14)" }]}>
                          <Ionicons
                            name={iconForQuickItem(row.item_key)}
                            size={24}
                            color={BakimateColors.accentTeal}
                          />
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={[styles.quickTitle, { color: headline }]} numberOfLines={1}>
                            {row.item_key}
                          </Text>
                          <Text style={[styles.quickMeta, { color: muted }]} numberOfLines={2}>
                            {t("insights_quick_item_row_line", {
                              credit: formatMoneyMinor(
                                row.credit_given_month_sen,
                                shopCurrency,
                                i18n.language,
                              ),
                              est: formatMoneyMinor(
                                row.estimated_udhaar_outstanding_sen,
                                shopCurrency,
                                i18n.language,
                              ),
                            })}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </>
              ) : null}

              {/* Shop health (dead money) */}
              {iq.data.business_pulse ? (
                <Pressable
                  onPress={() => setPulseExpanded((p) => !p)}
                  accessibilityRole="button"
                  style={[
                    styles.healthCard,
                    {
                      backgroundColor: isDark
                        ? "rgba(15, 23, 42, 0.55)"
                        : "rgba(255, 255, 255, 0.94)",
                      borderColor: isDark ? BakimateColors.glassBorderDark : BakimateColors.border,
                    },
                  ]}
                >
                  <View style={styles.healthHead}>
                    <Ionicons name="pulse" size={22} color={BakimateColors.danger} />
                    <Text style={[styles.sectionTitle, { color: headline, flex: 1 }]}>
                      {t("insights_shop_health_title")}
                    </Text>
                    <Ionicons name={pulseExpanded ? "chevron-up" : "chevron-down"} size={22} color={muted} />
                  </View>
                  <Text style={[styles.deadMoneyAmt, { color: BakimateColors.danger }]}>
                    {formatMoneyMinor(iq.data.business_pulse.dead_money_sen, shopCurrency, i18n.language)}
                  </Text>
                  <Text style={[styles.healthHint, { color: muted }]}>
                    {t("insights_shop_health_teaser", {
                      amount: formatMoneyMinor(
                        iq.data.business_pulse.dead_money_sen,
                        shopCurrency,
                        i18n.language,
                      ),
                    })}
                  </Text>

                  {pulseExpanded && (iq.data.business_pulse.top_loyalists ?? []).length > 0 ? (
                    <View style={styles.loyalistList}>
                      {iq.data.business_pulse.top_loyalists.map((row, idx) => (
                        <Pressable
                          key={`${row.customer_id}-${idx}`}
                          onPress={() => router.push(`/customer/${row.customer_id}`)}
                          style={({ pressed }) => [
                            styles.loyalistRow,
                            { opacity: pressed ? 0.88 : 1 },
                          ]}
                        >
                          <PersonAvatar
                            name={row.name}
                            customerId={row.customer_id}
                            kind="customer"
                            size="sm"
                          />
                          <Text style={[styles.loyalistName, { color: headline }]} numberOfLines={1}>
                            {row.name}
                          </Text>
                          <View style={styles.loyalistStars}>
                            {Array.from({ length: Math.min(row.installment_count, 5) }, (_, i) => (
                              <Ionicons key={i} name="star" size={14} color="#FBBF24" />
                            ))}
                          </View>
                        </Pressable>
                      ))}
                    </View>
                  ) : null}
                </Pressable>
              ) : null}

              {/* Single big pictogram for PDF share */}
              <Pressable
                disabled={monthPdfBusy || Platform.OS === "web"}
                onPress={onSharePdf}
                accessibilityRole="button"
                accessibilityLabel={t("insights_monthly_pdf_cta")}
                style={({ pressed }) => [
                  styles.pdfBigBtn,
                  {
                    opacity:
                      monthPdfBusy || pressed
                        ? 0.85
                        : Platform.OS === "web"
                          ? 0.45
                          : 1,
                  },
                ]}
              >
                {monthPdfBusy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="share" size={32} color="#fff" />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.pdfBigTitle}>{t("insights_monthly_pdf_title")}</Text>
                      <Text style={styles.pdfBigSub} numberOfLines={2}>
                        {t("insights_monthly_pdf_hint", { month: monthYyyyMm })}
                      </Text>
                    </View>
                  </>
                )}
              </Pressable>
            </>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1, backgroundColor: "transparent", paddingHorizontal: 18 },
  scroll: { paddingTop: 8 },

  summaryGlass: { marginTop: 8, marginBottom: 18 },
  summaryGlassInner: { padding: 14 },
  summaryRow: { flexDirection: "row", alignItems: "stretch" },
  summaryTileLeading: { marginRight: 12 },
  cardPad: { padding: 18 },
  chartGlass: { marginBottom: 20 },
  summaryTile: {
    flex: 1,
    minWidth: 0,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 10,
    alignItems: "center",
    gap: 6,
    borderWidth: 1.5,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: { elevation: 2 },
      default: {},
    }),
  },
  summaryCaption: { fontSize: 11, fontWeight: "900", letterSpacing: 0.6, textTransform: "uppercase" },

  legendRow: { flexDirection: "row", gap: 14, justifyContent: "center", marginBottom: 10 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendSwatch: { width: 14, height: 14, borderRadius: 4 },
  legendText: { fontSize: 12, fontWeight: "800" },

  chartRow: { flexDirection: "row", justifyContent: "space-between", gap: 4, marginTop: 6 },
  barCol: { flex: 1, alignItems: "center" },
  dayBars: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 3,
    width: "100%",
  },
  barSlot: { flex: 1, justifyContent: "flex-end", alignItems: "center" },
  collectBar: { width: "78%", borderRadius: 5, backgroundColor: BakimateColors.success },
  creditBar: { width: "78%", borderRadius: 5, backgroundColor: BakimateColors.danger + "CC" },
  barDay: { fontSize: 10, fontWeight: "800", marginTop: 6, textAlign: "center", maxWidth: 44 },

  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 18, fontWeight: "900", letterSpacing: -0.3 },
  emptyInline: { fontSize: 13, fontWeight: "700", marginBottom: 6, paddingHorizontal: 4 },

  waBtn: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#25D366",
    ...Platform.select({
      ios: {
        shadowColor: "#25D366",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.32,
        shadowRadius: 12,
      },
      android: { elevation: 4 },
      default: {},
    }),
  },

  quickRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
  },
  quickIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  quickTitle: { fontSize: 16, fontWeight: "900" },
  quickMeta: { marginTop: 4, fontSize: 12, fontWeight: "600", lineHeight: 17 },

  healthCard: {
    marginTop: 4,
    borderRadius: 22,
    padding: 18,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  healthHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  deadMoneyAmt: { fontSize: 32, fontWeight: "900", letterSpacing: -0.6 },
  healthHint: { fontSize: 13, fontWeight: "700", lineHeight: 19 },

  loyalistList: { marginTop: 10, gap: 6 },
  loyalistRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
  },
  loyalistName: { flex: 1, fontWeight: "800", fontSize: 14 },
  loyalistStars: { flexDirection: "row", gap: 2 },

  pdfBigBtn: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: BakimateColors.accentTeal,
    padding: 18,
    borderRadius: 22,
    ...Platform.select({
      ios: {
        shadowColor: BakimateColors.accentTeal,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
      },
      android: { elevation: 6 },
      default: {},
    }),
  },
  pdfBigTitle: { color: "#fff", fontWeight: "900", fontSize: 17 },
  pdfBigSub: { color: "#fff", marginTop: 4, fontWeight: "700", fontSize: 12, opacity: 0.9 },
});
