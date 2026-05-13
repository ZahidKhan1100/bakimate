import { MeshBackdrop } from "@/components/ui/mesh-backdrop";
import { BakimateColors } from "@/constants/bakimate-theme";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Qk } from "@/lib/hooks/query-keys";
import {
  isAnnualMembershipPackage,
  sortMembershipPackages,
} from "@/lib/membership-catalog";
import { paywallPlanReferenceBlurb, paywallPlanTitle } from "@/lib/paywall-plan-copy";
import { queryClient } from "@/lib/query-client";
import { ensureRevenueCatConfigured } from "@/lib/revenuecat-configure";
import { selectPaywallOffering } from "@/lib/revenuecat-offering";
import { getNativeRevenueCatApiKey, getPremiumEntitlementIdentifier } from "@/lib/revenuecat-settings";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
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
import Purchases, { type PurchasesPackage } from "react-native-purchases";

type BenefitItem = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  tone: string;
};

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
        const offerings = await Purchases.getOfferings();
        const { offering: selectedOffering } = selectPaywallOffering(offerings);
        const pkgsRaw = selectedOffering?.availablePackages ?? [];
        const pkgsSorted = sortMembershipPackages(pkgsRaw);
        if (!cancelled) {
          setPackages(pkgsSorted);
          setFatalError(pkgsSorted.length ? null : t("paywall_no_offerings"));
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
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <ScrollView
          contentContainerStyle={styles.container}
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
                  const accessLabel = `${title}${isBest ? `, ${t("membership_badge_best_value")}` : ""}, ${pkg.product.priceString}`;

                  return (
                    <Pressable
                      key={pkg.identifier}
                      accessibilityRole="button"
                      accessibilityLabel={accessLabel}
                      disabled={busy}
                      onPress={() => void buyPackage(pkg)}
                      style={({ pressed }) => [
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
                          opacity: busy && !thisBusy ? 0.45 : pressed ? 0.92 : 1,
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
                          { color: isBest ? "#fff" : BakimateColors.accentTeal },
                        ]}
                      >
                        {pkg.product.priceString}
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
                            <Text style={styles.planCtaText}>{t("paywall_subscribe")}</Text>
                          </>
                        )}
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={[styles.footerNote, { color: muted }]}>
                {t("membership_paywall_footer")}
              </Text>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1, backgroundColor: "transparent" },
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
});
