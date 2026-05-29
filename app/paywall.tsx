import { PaywallSubscriptionLegal } from "@/components/paywall-subscription-legal";
import { MeshBackdrop } from "@/components/ui/mesh-backdrop";
import { BakimateColors } from "@/constants/bakimate-theme";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Qk } from "@/lib/hooks/query-keys";
import {
  isAnnualMembershipPackage,
  sortMembershipPackages,
} from "@/lib/membership-catalog";
import { paywallPrimaryCtaLabel } from "@/lib/paywall-cta";
import { paywallPlanReferenceBlurb, paywallPlanTitle } from "@/lib/paywall-plan-copy";
import { queryClient } from "@/lib/query-client";
import { ensureRevenueCatConfigured } from "@/lib/revenuecat-configure";
import { resolvePaywallPackages } from "@/lib/revenuecat-offering";
import { getNativeRevenueCatApiKey, getPremiumEntitlementIdentifier } from "@/lib/revenuecat-settings";
import {
  isPurchasesInvalidReceiptError,
  isPurchasesStoreProblemError,
} from "@/lib/revenuecat-purchase-errors";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import * as Application from "expo-application";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Purchases, { type PurchasesPackage } from "react-native-purchases";

type BenefitItem = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  tone: string;
};

/** Debug-only: proves which bundle + API key this binary actually uses (ASC must match bundle). */
function devPaywallBuildHints(): string {
  const bid = Application.applicationId?.trim() || "(unknown applicationId)";
  const key = getNativeRevenueCatApiKey();
  const keyHint =
    key.length === 0
      ? "missing (set EXPO_PUBLIC_REVENUECAT_IOS_API_KEY / ANDROID and rebuild)"
      : Platform.OS === "ios" && key.startsWith("goog_")
        ? "goog_… — wrong key: use Apple public key appl_… on iOS"
        : Platform.OS === "android" && key.startsWith("appl_")
          ? "appl_… — wrong key: use Play public goog_… on Android"
          : `${key.slice(0, 8)}…`;

  return `This install: ${bid}\nRevenueCat SDK key: ${keyHint}`;
}

/** Non-purchasing layout so you can screenshot the paywall before RevenueCat offerings work. DEV only. */
function DevPaywallScreenshotPreview({
  t,
  headline,
  muted,
  isDark,
}: {
  t: TFunction;
  headline: string;
  muted: string;
  isDark: boolean;
}) {
  const plans: {
    title: string;
    blurb: string | null;
    price: string;
    isBest: boolean;
  }[] = [
    {
      title: t("membership_plan_monthly"),
      blurb: t("membership_ref_usd_monthly", { price: "$9" }),
      price: "—",
      isBest: false,
    },
    {
      title: t("membership_plan_3mo"),
      blurb: t("membership_ref_usd_3mo", { price: "$24" }),
      price: "—",
      isBest: false,
    },
    {
      title: t("membership_plan_6mo"),
      blurb: t("membership_ref_usd_6mo", { price: "$45" }),
      price: "—",
      isBest: false,
    },
    {
      title: t("membership_plan_year"),
      blurb: t("membership_ref_usd_year", { price: "$90" }),
      price: "—",
      isBest: true,
    },
  ];

  return (
    <View style={{ marginTop: 8, gap: 12 }}>
      <Text style={[styles.devShotCaption, { color: muted }]}>
        Static layout preview only — not connected to the App Store. Cards are not interactive until RevenueCat returns real packages.
      </Text>
      <View style={{ gap: 14 }}>
        {plans.map((p) => (
          <View
            key={p.title}
            accessibilityLabel={p.title}
            style={[
              styles.planCard,
              {
                backgroundColor: p.isBest
                  ? BakimateColors.accentTeal
                  : isDark
                    ? "rgba(15, 23, 42, 0.7)"
                    : "rgba(255, 255, 255, 0.99)",
                borderColor: p.isBest
                  ? BakimateColors.accentTeal
                  : isDark
                    ? BakimateColors.glassBorderDark
                    : BakimateColors.border,
              },
            ]}
          >
            {p.isBest ? (
              <View style={styles.bestBadge}>
                <Ionicons name="star" size={14} color="#FBBF24" />
                <Text style={styles.bestBadgeText}>{t("membership_badge_best_value")}</Text>
              </View>
            ) : null}
            <View style={styles.planTop}>
              <View
                style={[
                  styles.planIcon,
                  {
                    backgroundColor: p.isBest
                      ? "rgba(255, 255, 255, 0.25)"
                      : "rgba(46, 196, 182, 0.14)",
                  },
                ]}
              >
                <Ionicons
                  name={p.isBest ? "diamond" : "calendar"}
                  size={28}
                  color={p.isBest ? "#fff" : BakimateColors.accentTeal}
                />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  style={[styles.planTitle, { color: p.isBest ? "#fff" : headline }]}
                  numberOfLines={1}
                >
                  {p.title}
                </Text>
                {p.blurb ? (
                  <Text
                    style={[
                      styles.planRef,
                      {
                        color: p.isBest ? "rgba(255, 255, 255, 0.85)" : muted,
                      },
                    ]}
                    numberOfLines={2}
                  >
                    {p.blurb}
                  </Text>
                ) : null}
              </View>
            </View>
            <Text
              style={[
                styles.planPrice,
                { color: p.isBest ? "#fff" : BakimateColors.accentTeal },
              ]}
            >
              {p.price}
            </Text>
            <View
              style={[
                styles.planCtaRow,
                {
                  backgroundColor: p.isBest
                    ? "rgba(255, 255, 255, 0.2)"
                    : BakimateColors.accentTeal,
                },
              ]}
            >
              <Ionicons name="checkmark-circle" size={22} color="#fff" />
              <Text style={styles.planCtaText}>{t("paywall_subscribe")}</Text>
            </View>
          </View>
        ))}
      </View>
      <Text style={[styles.footerNote, { color: muted }]}>{t("membership_paywall_footer")}</Text>
    </View>
  );
}

export default function PaywallScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const router = useRouter();
  const scheme = useColorScheme();
  const theme = scheme === "dark" ? "dark" : "light";
  const isDark = theme === "dark";
  const headline = Colors[theme].text;
  const muted = isDark ? BakimateColors.neutralTextMutedDark : BakimateColors.neutralText;

  useEffect(() => {
    navigation.setOptions({ headerTitle: t("paywall_title"), title: t("paywall_title") });
  }, [navigation, t]);

  const [loading, setLoading] = useState(true);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [purchaseBusyId, setPurchaseBusyId] = useState<string | null>(null);

  async function buyPackage(pkg: PurchasesPackage) {
    setPurchaseError(null);
    setPurchaseBusyId(pkg.identifier);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      if (__DEV__) {
        const want = getPremiumEntitlementIdentifier();
        console.warn(
          "[BakiMate]",
          `After purchase — expected entitlement "${want}"; active:`,
          Object.keys(customerInfo.entitlements.active).join(", ") || "(none)",
        );
      }
      await Purchases.invalidateCustomerInfoCache();
      await queryClient.invalidateQueries({ queryKey: Qk.shopProfile });
      await queryClient.invalidateQueries({ queryKey: Qk.premiumRecordingAccess });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.back();
    } catch (e: unknown) {
      const err = e as { code?: unknown; message?: unknown; userCancelled?: boolean | null };
      const cancelled =
        err.userCancelled === true ||
        err.code === Purchases.PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR;
      if (cancelled) {
        return;
      }
      if (isPurchasesInvalidReceiptError(e)) {
        setPurchaseError(t("paywall_invalid_receipt_explainer"));
        return;
      }
      if (Platform.OS === "ios" && isPurchasesStoreProblemError(e)) {
        setPurchaseError(t("paywall_store_problem_ios_sandbox_explainer"));
        return;
      }
      const message =
        typeof err.message === "string" && err.message.trim() !== "" ? err.message : String(e);
      setPurchaseError(message);
    } finally {
      setPurchaseBusyId(null);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (Platform.OS === "web") {
        setLoading(false);
        setFatalError(t("paywall_native_only"));
        return;
      }

      const apiKey = getNativeRevenueCatApiKey();
      if (!apiKey) {
        setLoading(false);
        setFatalError(t("paywall_missing_api_key"));
        return;
      }

      try {
        const ok = await ensureRevenueCatConfigured();
        if (!ok) {
          if (!cancelled) {
            setFatalError(t("paywall_configure_failed"));
          }
          return;
        }
        /** Pull fresh offerings after dashboard changes / product deletions (`getOfferings` can serve a stale snapshot). */
        const offerings = await Purchases.syncAttributesAndOfferingsIfNeeded();
        if (__DEV__ && offerings.all != null) {
          const counts = Object.entries(offerings.all)
            .map(([k, o]) => {
              const n = "availablePackages" in o ? (o.availablePackages?.length ?? 0) : 0;
              return `${k}:${n}`;
            })
            .join(", ");
          console.warn("[BakiMate][Paywall] RevenueCat offerings.all package counts:", counts || "(empty)");
          console.warn("[BakiMate][Paywall] offerings.current:", offerings.current?.identifier ?? "(null)");
        }
        const resolved = resolvePaywallPackages(offerings);
        if (__DEV__) {
          console.warn("[BakiMate][Paywall] Resolved:", resolved.logLabel);
        }
        const pkgsRaw = resolved.packages;
        const pkgsSorted = sortMembershipPackages(pkgsRaw);
        if (!cancelled) {
          setPackages(pkgsSorted);
          if (pkgsSorted.length === 0) {
            const hasOfferingShell =
              offerings.current != null ||
              Boolean(offerings.all && Object.keys(offerings.all).length > 0);
            setFatalError(
              hasOfferingShell
                ? t("paywall_asc_products_not_loading")
                : t("paywall_no_offerings"),
            );
          } else {
            setFatalError(null);
          }
        }
      } catch (e: unknown) {
        if (!cancelled) {
          const raw =
            typeof e === "object" &&
            e !== null &&
            "message" in e &&
            typeof (e as { message?: unknown }).message === "string"
              ? (e as { message: string }).message
              : String(e);
          const lower = raw.toLowerCase();
          const looksOfferings404 = lower.includes("404") || lower.includes("offeringsmanager");

          setFatalError(looksOfferings404 ? t("paywall_rc_offerings_404") : raw);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [t]);

  const benefits: BenefitItem[] = [
    { icon: "arrow-up", label: t("quick_gave"), tone: BakimateColors.danger },
    { icon: "arrow-down", label: t("quick_got"), tone: BakimateColors.success },
    { icon: "logo-whatsapp", label: t("insights_whatsapp_nudge"), tone: "#25D366" },
    { icon: "document-text", label: t("insights_monthly_pdf_cta"), tone: BakimateColors.accentTeal },
  ];

  return (
    <View style={styles.root}>
      <MeshBackdrop isDark={isDark} />
      {/* Top inset is handled by the native stack header; including "top" here doubles padding on modals */}
      <SafeAreaView style={[styles.safe, styles.safeLayer]} edges={["bottom"]}>
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Hero */}
          <View style={styles.heroWrap}>
            <View
              style={[
                styles.heroDisc,
                {
                  backgroundColor: isDark
                    ? "rgba(46, 196, 182, 0.2)"
                    : "rgba(46, 196, 182, 0.14)",
                },
              ]}
            >
              <Ionicons name="diamond" size={56} color={BakimateColors.accentTeal} />
            </View>
            <Text style={[styles.title, { color: headline }]}>{t("paywall_title")}</Text>

            {!loading && !fatalError && packages.length > 0 ? (
              <View style={styles.trialPill}>
                <Ionicons name="gift" size={16} color={BakimateColors.accentTeal} />
                <Text style={styles.trialPillText}>{t("membership_trial_heading")}</Text>
              </View>
            ) : null}

            <Text style={[styles.body, { color: muted }]}>{t("paywall_body")}</Text>
          </View>

          {/* Benefit checklist */}
          <View
            style={[
              styles.benefitsCard,
              {
                backgroundColor: isDark
                  ? "rgba(15, 23, 42, 0.55)"
                  : "rgba(255, 255, 255, 0.94)",
                borderColor: isDark ? BakimateColors.glassBorderDark : BakimateColors.border,
              },
            ]}
          >
            {benefits.map((b) => (
              <View key={b.label} style={styles.benefitRow}>
                <View style={[styles.benefitDisc, { backgroundColor: `${b.tone}1F` }]}>
                  <Ionicons name={b.icon} size={20} color={b.tone} />
                </View>
                <Text style={[styles.benefitText, { color: headline }]} numberOfLines={1}>
                  {b.label}
                </Text>
                <Ionicons name="checkmark-circle" size={22} color={BakimateColors.success} />
              </View>
            ))}
          </View>

          {/* Plans */}
          {loading ? (
            <ActivityIndicator
              style={{ marginTop: 28 }}
              color={BakimateColors.accentTeal}
              size="large"
            />
          ) : fatalError ? (
            <>
              {__DEV__ ? (
                <View
                  style={[
                    styles.devRcNote,
                    {
                      backgroundColor: isDark
                        ? "rgba(46, 196, 182, 0.12)"
                        : "rgba(46, 196, 182, 0.1)",
                      borderColor: BakimateColors.accentTeal,
                    },
                  ]}
                >
                  <Ionicons name="information-circle" size={22} color={BakimateColors.accentTeal} />
                  <View style={{ flex: 1, minWidth: 0, gap: 8 }}>
                    <Text style={[styles.devRcNoteText, { color: headline }]}>
                      RevenueCat did not load any packages (debug build only).
                    </Text>
                    <Text style={[styles.devRcErrorDetail, { color: headline }]} selectable>
                      {fatalError}
                    </Text>
                    <Text style={[styles.devRcNoteCaption, { color: muted }]}>
                      Fix the issue above, then restart the app. The cards below are placeholders only — they cannot start a purchase until offerings load.
                    </Text>
                    <Text style={[styles.devRcBuildHints, { color: muted }]} selectable>
                      {devPaywallBuildHints()}
                    </Text>
                    {Platform.OS === "ios" ? (
                      <Text style={[styles.devRcStoreKitHint, { color: BakimateColors.accentTeal }]}>
                        {t("paywall_dev_storekit_launch_hint")}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ) : (
                <View
                  style={[
                    styles.errorCard,
                    {
                      backgroundColor: isDark
                        ? "rgba(239, 68, 68, 0.12)"
                        : "rgba(239, 68, 68, 0.08)",
                      borderColor: BakimateColors.danger,
                    },
                  ]}
                >
                  <Ionicons name="alert-circle" size={24} color={BakimateColors.danger} />
                  <Text style={[styles.errorText, { color: BakimateColors.danger }]}>{fatalError}</Text>
                </View>
              )}
              {__DEV__ ? (
                <DevPaywallScreenshotPreview headline={headline} muted={muted} t={t} isDark={isDark} />
              ) : null}
            </>
          ) : (
            <>
              {purchaseError ? (
                <View
                  style={[
                    styles.errorCard,
                    {
                      backgroundColor: isDark
                        ? "rgba(239, 68, 68, 0.12)"
                        : "rgba(239, 68, 68, 0.08)",
                      borderColor: BakimateColors.danger,
                    },
                  ]}
                >
                  <Ionicons name="alert-circle" size={20} color={BakimateColors.danger} />
                  <Text style={[styles.errorText, { color: BakimateColors.danger }]}>
                    {purchaseError}
                  </Text>
                </View>
              ) : null}

              <View style={styles.plansGrid}>
                {packages.map((pkg) => {
                  const busy = purchaseBusyId !== null;
                  const thisBusy = purchaseBusyId === pkg.identifier;
                  const title = paywallPlanTitle(pkg, t);
                  const isBest = isAnnualMembershipPackage(pkg);
                  const refBlurb = paywallPlanReferenceBlurb(pkg, t);
                  const priceStr =
                    typeof pkg.product.priceString === "string" ? pkg.product.priceString.trim() : "";
                  const storePriceLabel = priceStr !== "" ? priceStr : t("paywall_price_pending_store");
                  const accessLabel = `${title}${isBest ? `, ${t("membership_badge_best_value")}` : ""}, ${storePriceLabel}`;
                  const ctaLabel = paywallPrimaryCtaLabel(pkg, t);

                  return (
                    <TouchableOpacity
                      key={pkg.identifier}
                      accessibilityRole="button"
                      accessibilityLabel={accessLabel}
                      activeOpacity={0.92}
                      disabled={busy}
                      onPress={() => void buyPackage(pkg)}
                      style={[
                        styles.planCard,
                        {
                          backgroundColor: isBest
                            ? BakimateColors.accentTeal
                            : isDark
                              ? "rgba(15, 23, 42, 0.7)"
                              : "rgba(255, 255, 255, 0.99)",
                          borderColor: isBest
                            ? BakimateColors.accentTeal
                            : isDark
                              ? BakimateColors.glassBorderDark
                              : BakimateColors.border,
                          opacity: busy && !thisBusy ? 0.45 : 1,
                        },
                      ]}
                    >
                      {isBest ? (
                        <View style={styles.bestBadge}>
                          <Ionicons name="star" size={14} color="#FBBF24" />
                          <Text style={styles.bestBadgeText}>
                            {t("membership_badge_best_value")}
                          </Text>
                        </View>
                      ) : null}

                      <View style={styles.planTop}>
                        <View
                          style={[
                            styles.planIcon,
                            {
                              backgroundColor: isBest
                                ? "rgba(255, 255, 255, 0.25)"
                                : "rgba(46, 196, 182, 0.14)",
                            },
                          ]}
                        >
                          <Ionicons
                            name={isBest ? "diamond" : "calendar"}
                            size={28}
                            color={isBest ? "#fff" : BakimateColors.accentTeal}
                          />
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text
                            style={[
                              styles.planTitle,
                              { color: isBest ? "#fff" : headline },
                            ]}
                            numberOfLines={1}
                          >
                            {title}
                          </Text>
                          {refBlurb ? (
                            <Text
                              style={[
                                styles.planRef,
                                {
                                  color: isBest
                                    ? "rgba(255, 255, 255, 0.85)"
                                    : muted,
                                },
                              ]}
                              numberOfLines={1}
                            >
                              {refBlurb}
                            </Text>
                          ) : null}
                        </View>
                      </View>

                      <Text
                        style={[
                          styles.planPrice,
                          {
                            fontSize: priceStr !== "" ? 36 : 16,
                            lineHeight: priceStr !== "" ? undefined : 22,
                          },
                          { color: isBest ? "#fff" : BakimateColors.accentTeal },
                        ]}
                      >
                        {storePriceLabel}
                      </Text>

                      <View
                        style={[
                          styles.planCtaRow,
                          {
                            backgroundColor: isBest
                              ? "rgba(255, 255, 255, 0.2)"
                              : BakimateColors.accentTeal,
                          },
                        ]}
                      >
                        {thisBusy ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <>
                            <Ionicons name="checkmark-circle" size={22} color="#fff" />
                            <Text style={styles.planCtaText}>{ctaLabel}</Text>
                          </>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.footerNote, { color: muted }]}>
                {t("membership_paywall_footer")}
              </Text>
            </>
          )}

          {Platform.OS !== "web" ? (
            <PaywallSubscriptionLegal
              packages={packages}
              t={t}
              muted={muted}
              accent={BakimateColors.accentTeal}
            />
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, position: "relative" },
  safe: { flex: 1, backgroundColor: "transparent" },
  safeLayer: { zIndex: 1 },
  container: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 8, gap: 14 },

  heroWrap: { alignItems: "center", gap: 10, paddingTop: 8, paddingBottom: 12 },
  heroDisc: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
    ...Platform.select({
      ios: {
        shadowColor: BakimateColors.accentTeal,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
      },
      android: { elevation: 6 },
      default: {},
    }),
  },
  title: { fontSize: 30, fontWeight: "900", letterSpacing: -0.6 },
  trialPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(46, 196, 182, 0.16)",
    marginTop: 2,
  },
  trialPillText: { fontWeight: "900", fontSize: 12, color: BakimateColors.accentTeal },
  trialBlurb: {
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 17,
    textAlign: "center",
    paddingHorizontal: 8,
    marginTop: 4,
  },
  body: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
    textAlign: "center",
    paddingHorizontal: 12,
    marginTop: 4,
  },

  benefitsCard: {
    padding: 16,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  benefitRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  benefitDisc: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  benefitText: { flex: 1, fontWeight: "800", fontSize: 15 },

  errorCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  errorText: { flex: 1, fontWeight: "800", fontSize: 13, lineHeight: 18 },

  plansGrid: { gap: 14, marginTop: 4 },
  planCard: {
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 18,
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: { elevation: 4 },
      default: {},
    }),
  },
  bestBadge: {
    position: "absolute",
    top: -10,
    right: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#1F2937",
  },
  bestBadgeText: { color: "#FBBF24", fontSize: 11, fontWeight: "900", letterSpacing: 0.3 },
  planTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  planIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  planTitle: { fontSize: 19, fontWeight: "900", letterSpacing: -0.3 },
  planRef: { marginTop: 2, fontSize: 12, fontWeight: "700" },
  planPrice: { fontSize: 36, fontWeight: "900", letterSpacing: -1, marginTop: 2 },
  planCtaRow: {
    marginTop: 4,
    borderRadius: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  planCtaText: { color: "#fff", fontWeight: "900", fontSize: 16 },

  footerNote: {
    marginTop: 12,
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 17,
    textAlign: "center",
  },
  devShotCaption: {
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 16,
    textAlign: "center",
    opacity: 0.85,
  },
  devRcNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  devRcNoteText: { fontWeight: "800", fontSize: 13, lineHeight: 18 },
  devRcErrorDetail: { fontWeight: "600", fontSize: 12, lineHeight: 17 },
  devRcNoteCaption: { fontWeight: "600", fontSize: 11, lineHeight: 16 },
  devRcBuildHints: { fontWeight: "500", fontSize: 10, lineHeight: 14, marginTop: 6 },
  devRcStoreKitHint: { fontWeight: "700", fontSize: 11, lineHeight: 16, marginTop: 6 },
});
