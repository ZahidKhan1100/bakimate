import { GlassSurface } from "@/components/ui/glass-surface";
import { MeshBackdrop } from "@/components/ui/mesh-backdrop";
import { MoneyDisplay } from "@/components/ui/money-display";
import { PersonAvatar } from "@/components/ui/person-avatar";
import { PersonRow } from "@/components/ui/person-row";
import { SignInHero } from "@/components/ui/sign-in-hero";
import { BakimateColors } from "@/constants/bakimate-theme";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { presentRewardedAdGate } from "@/lib/ads/rewarded-ad-gate";
import { formatMonthLabel, recentMonthKeys, todayYmd } from "@/lib/calendar-ymd";
import { formatChartWeekdayLabel } from "@/lib/format-dates";
import { useInsights } from "@/lib/hooks/useInsights";
import { usePullToRefresh } from "@/lib/hooks/usePullToRefresh";
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
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { type ReactNode, useMemo, useState } from "react";
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

function InsightSection({
  isDark,
  headline,
  muted,
  icon,
  iconBg,
  iconColor,
  title,
  hint,
  children,
}: {
  isDark: boolean;
  headline: string;
  muted: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <GlassSurface isDark={isDark} style={styles.sectionGlass} contentStyle={styles.sectionGlassInner}>
      <View style={styles.sectionHead}>
        <View style={[styles.sectionIconWrap, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={20} color={iconColor} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.sectionTitle, { color: headline }]}>{title}</Text>
          {hint ? (
            <Text style={[styles.sectionHint, { color: muted }]}>{hint}</Text>
          ) : null}
        </View>
      </View>
      {children}
    </GlassSurface>
  );
}

function CashflowBars({
  days,
  labelColor,
  language,
  emptyLabel,
  isDark,
}: {
  days: InsightsWeekCashflowDay[];
  labelColor: string;
  language: string;
  emptyLabel: string;
  isDark: boolean;
}) {
  const maxSen = Math.max(
    ...days.flatMap((d) => [d.payments_collected_sen ?? 0, d.credit_given_sen ?? 0]),
    1,
  );
  const hasActivity = days.some(
    (d) => (d.payments_collected_sen ?? 0) > 0 || (d.credit_given_sen ?? 0) > 0,
  );
  const chartH = 100;
  const minVis = 4;
  const gridColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)";

  if (!hasActivity) {
    return (
      <View style={styles.chartEmpty}>
        <Ionicons name="bar-chart-outline" size={28} color={labelColor} />
        <Text style={[styles.chartEmptyText, { color: labelColor }]}>{emptyLabel}</Text>
      </View>
    );
  }

  return (
    <View style={styles.chartPlot}>
      {[24, 52, 80].map((top) => (
        <View
          key={`grid-${top}`}
          style={[styles.chartGridLine, { top, backgroundColor: gridColor }]}
        />
      ))}
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
    </View>
  );
}

function NudgeRow({
  id,
  name,
  phone,
  balanceSen,
  subline,
  currencyCode,
  isDark,
  onOpen,
  onWhatsApp,
  waLabel,
}: {
  id: number;
  name: string;
  balanceSen: number;
  subline: string;
  currencyCode: string;
  isDark: boolean;
  onOpen: () => void;
  onWhatsApp: () => void;
  waLabel: string;
}) {
  const headline = Colors[isDark ? "dark" : "light"].text;
  const muted = isDark ? BakimateColors.neutralTextMutedDark : BakimateColors.neutralText;

  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={name}
      style={({ pressed }) => [
        styles.nudgeRow,
        {
          backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.03)",
          borderColor: isDark ? BakimateColors.glassBorderDark : "rgba(15,23,42,0.08)",
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <PersonAvatar name={name} customerId={id} kind="customer" size="md" />
      <View style={styles.nudgeBody}>
        <Text style={[styles.nudgeName, { color: headline }]} numberOfLines={2}>
          {name}
        </Text>
        <Text style={[styles.nudgeSubline, { color: BakimateColors.danger }]} numberOfLines={1}>
          {subline}
        </Text>
        <MoneyDisplay
          sen={balanceSen}
          currencyCode={currencyCode}
          tone="debt"
          size="small"
          align="left"
        />
      </View>
      <Pressable
        onPress={onWhatsApp}
        accessibilityRole="button"
        accessibilityLabel={waLabel}
        hitSlop={8}
        style={({ pressed }) => [styles.waBtnCompact, { opacity: pressed ? 0.88 : 1 }]}
      >
        <Ionicons name="logo-whatsapp" size={24} color="#fff" />
      </Pressable>
    </Pressable>
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
  const screenBg = isDark ? "#000000" : "#F2F2F7";

  const token = useSessionStore((s) => s.token);
  const user = useSessionStore((s) => s.user);
  const shopProfiles = useSessionStore((s) => s.shopProfiles);

  const iq = useInsights();
  const pullRefresh = usePullToRefresh(() => iq.refetch());
  const premiumRecording = usePremiumRecordingAccess(Boolean(token));

  const [monthYyyyMm, setMonthYyyyMm] = useState(() => todayYmd().slice(0, 7));
  const monthChoices = useMemo(() => recentMonthKeys(12), []);
  const [monthPdfBusy, setMonthPdfBusy] = useState(false);
  const [pulseExpanded, setPulseExpanded] = useState(false);
  /** Chart, stock pulse and shop health stay folded so the default view is three simple cards. */
  const [detailsOpen, setDetailsOpen] = useState(false);

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
      await presentRewardedAdGate(premiumRecording.data);
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
    <View style={[styles.root, { backgroundColor: screenBg }]}>
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
          contentContainerStyle={[styles.scroll, { paddingBottom: tabBarHeight + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerBlock}>
            <Pressable
              onPress={() => (router.canGoBack() ? router.back() : router.navigate("/"))}
              accessibilityRole="button"
              accessibilityLabel={t("tab_home")}
              hitSlop={12}
              style={({ pressed }) => [styles.backRow, { opacity: pressed ? 0.6 : 1 }]}
            >
              <Ionicons name="chevron-back" size={24} color={BakimateColors.accentTeal} />
              <Text style={[styles.backText, { color: BakimateColors.accentTeal }]}>{t("tab_home")}</Text>
            </Pressable>
            <Text style={[styles.screenTitle, { color: headline }]}>{t("insights_title")}</Text>
            <Text style={[styles.screenSubtitle, { color: muted }]}>{t("insights_subtitle")}</Text>
          </View>

          {!token ? (
            <SignInHero isDark={isDark} />
          ) : iq.isLoading ? (
            <ActivityIndicator style={{ marginTop: 36 }} color={BakimateColors.accentTeal} />
          ) : iq.error && !iq.data ? (
            <Text style={{ color: BakimateColors.danger, marginTop: 14, fontWeight: "700" }}>
              {apiErrorMessage(iq.error)}
            </Text>
          ) : iq.data ? (
            <View style={styles.sectionsStack}>
              <GlassSurface isDark={isDark} style={styles.summaryGlass} contentStyle={styles.summaryGlassInner}>
                <Text style={[styles.summaryKicker, { color: muted }]}>{t("insights_this_week_title")}</Text>
                <View style={styles.summaryRow}>
                  <LinearGradient
                    colors={
                      isDark
                        ? ["rgba(52, 211, 153, 0.22)", "rgba(15, 23, 42, 0.9)"]
                        : ["rgba(209, 250, 229, 0.95)", "rgba(255, 255, 255, 0.98)"]
                    }
                    style={[
                      styles.summaryTile,
                      styles.summaryTileLeading,
                      { borderColor: isDark ? "rgba(52, 211, 153, 0.4)" : "rgba(52, 211, 153, 0.35)" },
                    ]}
                  >
                    <Ionicons name="cash" size={28} color={BakimateColors.success} />
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
                  </LinearGradient>

                  <LinearGradient
                    colors={
                      isDark
                        ? ["rgba(251, 113, 133, 0.2)", "rgba(15, 23, 42, 0.9)"]
                        : ["rgba(254, 226, 226, 0.95)", "rgba(255, 255, 255, 0.98)"]
                    }
                    style={[
                      styles.summaryTile,
                      { borderColor: isDark ? "rgba(251, 113, 133, 0.4)" : "rgba(248, 113, 113, 0.35)" },
                    ]}
                  >
                    <Ionicons name="arrow-up" size={28} color={BakimateColors.danger} />
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
                  </LinearGradient>
                </View>
              </GlassSurface>

              <InsightSection
                isDark={isDark}
                headline={headline}
                muted={muted}
                icon="people"
                iconBg={isDark ? "rgba(251, 113, 133, 0.18)" : "rgba(254, 226, 226, 0.9)"}
                iconColor={BakimateColors.danger}
                title={t("insights_top_debtors_title")}
                hint={t("insights_tap_customer")}
              >
                {iq.data.top_debtors.length === 0 ? (
                  <Text style={[styles.emptyInline, { color: muted }]}>
                    {t("insights_top_debtors_empty")}
                  </Text>
                ) : (
                  <View style={styles.listGap}>
                    {iq.data.top_debtors.slice(0, 5).map((row) => (
                      <PersonRow
                        key={row.id}
                        id={row.id}
                        name={row.name}
                        balanceSen={row.balance_sen}
                        currencyCode={shopCurrency}
                        isDark={isDark}
                        kind="customer"
                        nameLines={2}
                        onPress={() => router.push(`/customer/${row.id}`)}
                      />
                    ))}
                  </View>
                )}
              </InsightSection>

              <InsightSection
                isDark={isDark}
                headline={headline}
                muted={muted}
                icon="notifications"
                iconBg={isDark ? "rgba(251, 191, 36, 0.18)" : "rgba(254, 243, 199, 0.95)"}
                iconColor="#FBBF24"
                title={t("insights_weekly_nudges_title")}
                hint={t("insights_weekly_nudges_hint_short")}
              >
                {iq.data.weekly_nudges.length === 0 ? (
                  <Text style={[styles.emptyInline, { color: muted }]}>
                    {t("insights_weekly_nudges_empty")}
                  </Text>
                ) : (
                  <View style={styles.listGap}>
                    {iq.data.weekly_nudges.map((n) => (
                      <NudgeRow
                        key={n.id}
                        id={n.id}
                        name={n.name}
                        balanceSen={n.balance_sen}
                        currencyCode={shopCurrency}
                        isDark={isDark}
                        subline={
                          typeof n.days_since_payment === "number"
                            ? t("insights_days_since_payment", { count: n.days_since_payment })
                            : t("insights_no_payment_history")
                        }
                        onOpen={() => router.push(`/customer/${n.id}`)}
                        onWhatsApp={() => {
                          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                          void onNudgeWa(n.name, n.phone, n.balance_sen);
                        }}
                        waLabel={t("insights_whatsapp_nudge")}
                      />
                    ))}
                  </View>
                )}
              </InsightSection>

              <Pressable
                onPress={() => setDetailsOpen((v) => !v)}
                accessibilityRole="button"
                style={({ pressed }) => [styles.detailsToggle, { opacity: pressed ? 0.7 : 1 }]}
              >
                <Ionicons name={detailsOpen ? "chevron-up" : "chevron-down"} size={20} color={muted} />
                <Text style={[styles.detailsToggleText, { color: muted }]}>
                  {detailsOpen ? t("insights_less_details") : t("insights_more_details")}
                </Text>
              </Pressable>

              {detailsOpen ? (
                <>
              <GlassSurface isDark={isDark} style={styles.chartGlass} contentStyle={styles.cardPad}>
                <Text style={[styles.chartTitle, { color: headline }]}>{t("insights_cashflow_title")}</Text>
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
                  emptyLabel={t("insights_chart_empty")}
                  isDark={isDark}
                />
                <Text style={[styles.chartFoot, { color: muted }]}>{t("insights_cashflow_foot_short")}</Text>
              </GlassSurface>

              {(iq.data.credit_item_pulse ?? []).length > 0 ? (
                <InsightSection
                  isDark={isDark}
                  headline={headline}
                  muted={muted}
                  icon="cube"
                  iconBg={isDark ? "rgba(46, 196, 182, 0.18)" : "rgba(204, 251, 241, 0.9)"}
                  iconColor={BakimateColors.accentTeal}
                  title={t("insights_quick_item_pulse_title")}
                  hint={t("insights_quick_item_pulse_sub_short")}
                >
                  <View style={styles.listGap}>
                    {iq.data.credit_item_pulse!.map((row) => (
                      <View
                        key={row.item_key}
                        style={[
                          styles.quickRow,
                          {
                            backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.03)",
                            borderColor: isDark ? BakimateColors.glassBorderDark : "rgba(15,23,42,0.08)",
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
                </InsightSection>
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

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingVertical: 4, marginBottom: 10 }}
              >
                {monthChoices.map((m) => {
                  const sel = monthYyyyMm === m;
                  return (
                    <Pressable
                      key={m}
                      onPress={() => setMonthYyyyMm(m)}
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
                        style={{
                          color: sel ? BakimateColors.accentTeal : muted,
                          fontWeight: "800",
                          fontSize: 13,
                        }}
                      >
                        {formatMonthLabel(m, i18n.language)}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

                </>
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
                        {t("insights_monthly_pdf_hint", {
                          month: formatMonthLabel(monthYyyyMm, i18n.language),
                        })}
                      </Text>
                    </View>
                  </>
                )}
              </Pressable>
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  backRow: { flexDirection: "row", alignItems: "center", gap: 2, alignSelf: "flex-start", marginBottom: 8 },
  backText: { fontSize: 17, fontWeight: "700" },
  detailsToggle: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12 },
  detailsToggleText: { fontSize: 15, fontWeight: "800" },
  root: { flex: 1 },
  safe: { flex: 1, backgroundColor: "transparent", paddingHorizontal: 12 },
  scroll: { paddingTop: 4 },

  headerBlock: { paddingHorizontal: 8, marginBottom: 14 },
  screenTitle: { fontSize: 34, fontWeight: "700", letterSpacing: 0.3, marginTop: 2 },
  screenSubtitle: { marginTop: 6, fontSize: 15, fontWeight: "500", lineHeight: 21 },

  sectionsStack: { gap: 14, paddingHorizontal: 4 },

  summaryGlass: {},
  summaryGlassInner: { padding: 16, gap: 12 },
  summaryKicker: { fontSize: 14, fontWeight: "800", letterSpacing: 0.5, textTransform: "uppercase" },
  summaryRow: { flexDirection: "row", alignItems: "stretch" },
  summaryTileLeading: { marginRight: 10, flex: 1 },
  cardPad: { padding: 16, gap: 10 },
  chartGlass: {},
  summaryTile: {
    flex: 1,
    minWidth: 0,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
  },
  summaryCaption: { fontSize: 13, fontWeight: "900", letterSpacing: 0.6, textTransform: "uppercase" },

  chartTitle: { fontSize: 16, fontWeight: "900", letterSpacing: -0.2, marginBottom: 4 },
  chartFoot: { fontSize: 14, fontWeight: "600", lineHeight: 17, marginTop: 10, textAlign: "center" },
  legendRow: { flexDirection: "row", gap: 16, justifyContent: "center", marginBottom: 8 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendSwatch: { width: 12, height: 12, borderRadius: 3 },
  legendText: { fontSize: 14, fontWeight: "700" },

  chartPlot: { position: "relative", marginTop: 4, minHeight: 128 },
  chartGridLine: { position: "absolute", left: 0, right: 0, height: StyleSheet.hairlineWidth },
  chartRow: { flexDirection: "row", justifyContent: "space-between", gap: 4, paddingTop: 8 },
  chartEmpty: { alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 28 },
  chartEmptyText: { fontSize: 13, fontWeight: "700", textAlign: "center", paddingHorizontal: 12 },
  barCol: { flex: 1, alignItems: "center" },
  dayBars: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 4,
    width: "100%",
  },
  barSlot: { flex: 1, justifyContent: "flex-end", alignItems: "center" },
  collectBar: { width: "82%", borderRadius: 6, backgroundColor: BakimateColors.success },
  creditBar: { width: "82%", borderRadius: 6, backgroundColor: BakimateColors.danger },
  barDay: { fontSize: 13, fontWeight: "700", marginTop: 8, textAlign: "center" },

  sectionGlass: {},
  sectionGlassInner: { padding: 16, gap: 12 },
  sectionHead: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  sectionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: { fontSize: 17, fontWeight: "900", letterSpacing: -0.2 },
  sectionHint: { marginTop: 4, fontSize: 13, fontWeight: "600", lineHeight: 18 },
  emptyInline: { fontSize: 13, fontWeight: "700", lineHeight: 19 },
  listGap: { gap: 8 },

  nudgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  nudgeBody: { flex: 1, minWidth: 0, gap: 2 },
  nudgeName: { fontSize: 16, fontWeight: "800", lineHeight: 21 },
  nudgeSubline: { fontSize: 14, fontWeight: "700" },
  waBtnCompact: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#25D366",
    ...Platform.select({
      ios: {
        shadowColor: "#25D366",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.28,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
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
  quickMeta: { marginTop: 4, fontSize: 14, fontWeight: "600", lineHeight: 17 },

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

  monthChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
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
  pdfBigSub: { color: "#fff", marginTop: 4, fontWeight: "700", fontSize: 14, opacity: 0.9 },
});
