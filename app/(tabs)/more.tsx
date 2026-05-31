import { BottomSheet } from "@/components/ui/bottom-sheet";
import { GlassSurface } from "@/components/ui/glass-surface";
import { MeshBackdrop } from "@/components/ui/mesh-backdrop";
import { PersonAvatar } from "@/components/ui/person-avatar";
import { PictogramTile } from "@/components/ui/pictogram-tile";
import { ScreenHeroHeader } from "@/components/ui/screen-hero-header";
import { BakimateColors } from "@/constants/bakimate-theme";
import { getPrivacyPolicyUrl, getTermsOfUseUrl, getWebsiteBaseUrl } from "@/constants/site";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { authApiErrorMessage, deleteAuthenticatedAccount } from "@/lib/auth-api";
import { formatSubscriptionExpiryDateTime } from "@/lib/format-subscription-expiry";
import { Qk } from "@/lib/hooks/query-keys";
import { usePremiumRecordingAccess } from "@/lib/hooks/usePremiumRecordingAccess";
import { getNativeRevenueCatApiKey } from "@/lib/revenuecat-settings";
import { queryClient } from "@/lib/query-client";
import { fetchShopProfile } from "@/lib/shop-api";
import { useSessionStore } from "@/stores/session-store";
import {
  VOICE_STT_LOCALE_OPTIONS,
  type VoiceSttLocalePreference,
} from "@/lib/voice-stt-locale";
import { useUiPreferencesStore, type ColorSchemePreference } from "@/stores/ui-preferences-store";
import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useQuery } from "@tanstack/react-query";
import * as Linking from "expo-linking";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function MoreScreen() {
  const { t, i18n } = useTranslation();
  const raw = useColorScheme();
  const theme = raw === "dark" ? "dark" : "light";
  const isDark = theme === "dark";
  const headline = Colors[theme].text;
  const muted = isDark ? BakimateColors.neutralTextMutedDark : BakimateColors.neutralText;

  const token = useSessionStore((s) => s.token);
  const tabBarHeight = useBottomTabBarHeight();
  const user = useSessionStore((s) => s.user);
  const logout = useSessionStore((s) => s.logout);

  const shopQuery = useQuery({
    queryKey: Qk.shopProfile,
    queryFn: fetchShopProfile,
    enabled: Boolean(token && user),
    staleTime: 30 * 1000,
  });

  const premium = usePremiumRecordingAccess(Boolean(token));
  const hasRcApiKey = Boolean(getNativeRevenueCatApiKey());
  /** Trial / subscribed on server (`subscription_expires_at`) or RevenueCat entitlement (hook merges server when RC is configured). */
  const hasPremiumAccess =
    Boolean(token && shopQuery.data?.subscription_active) ||
    Boolean(token && hasRcApiKey && premium.data?.entitled);

  const themePref = useUiPreferencesStore((s) => s.colorSchemePreference);
  const setThemePref = useUiPreferencesStore((s) => s.setColorSchemePreference);
  const voiceSttLocale = useUiPreferencesStore((s) => s.voiceSttLocale);
  const setVoiceSttLocale = useUiPreferencesStore((s) => s.setVoiceSttLocale);

  const voiceSttLabel =
    VOICE_STT_LOCALE_OPTIONS.find((o) => o.key === voiceSttLocale)?.labelKey ?? "voice_stt_auto";

  const [themePickerOpen, setThemePickerOpen] = useState(false);
  const [langPickerOpen, setLangPickerOpen] = useState(false);
  const [voiceSttPickerOpen, setVoiceSttPickerOpen] = useState(false);
  const [deleteAccountBusy, setDeleteAccountBusy] = useState(false);

  const confirmSignOut = () => {
    Alert.alert(t("sign_out"), undefined, [
      { text: t("cancel"), style: "cancel" },
      { text: t("sign_out"), style: "destructive", onPress: () => logout() },
    ]);
  };

  const subscriptionLine = (() => {
    const shop = shopQuery.data;
    if (!shop) return null;
    const iso = shop.subscription_expires_at ?? null;
    const active = shop.subscription_active ?? false;
    if (!iso) return t("subscription_expires_unknown");
    const dateStr = formatSubscriptionExpiryDateTime(iso, i18n.language);
    return active
      ? t("subscription_expires_active", { date: dateStr })
      : t("subscription_expires_expired", { date: dateStr });
  })();

  const subscriptionExpired =
    Boolean(shopQuery.data?.subscription_expires_at) && !(shopQuery.data?.subscription_active ?? false);

  async function executeAccountDeletion(): Promise<void> {
    setDeleteAccountBusy(true);
    try {
      await deleteAuthenticatedAccount();
      queryClient.clear();
      logout();
      router.replace("/login");
    } catch (e: unknown) {
      Alert.alert(t("error"), authApiErrorMessage(e));
    } finally {
      setDeleteAccountBusy(false);
    }
  }

  function confirmDeleteAccount() {
    Alert.alert(t("account_delete_confirm_title"), t("account_delete_confirm_body"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("account_delete_step_next"),
        style: "destructive",
        onPress: () => {
          Alert.alert(t("account_delete_confirm_final_title"), t("account_delete_confirm_final_body"), [
            { text: t("cancel"), style: "cancel" },
            {
              text: t("account_delete_execute"),
              style: "destructive",
              onPress: () => void executeAccountDeletion(),
            },
          ]);
        },
      },
    ]);
  }

  if (!token || !user) {
    return (
      <View style={styles.flex}>
        <MeshBackdrop isDark={isDark} />
        <SafeAreaView style={styles.safe} edges={["top"]}>
          <ScreenHeroHeader
            eyebrow={t("more_screen_eyebrow")}
            title={t("tab_more")}
            subtitle={t("more_sign_in_via_login")}
            headlineColor={headline}
            mutedColor={muted}
            marginBottom={22}
          />
          <Pressable
            onPress={() => router.replace("/login")}
            accessibilityRole="button"
            accessibilityLabel={t("go_to_login")}
            style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}
          >
            <LinearGradient
              colors={[BakimateColors.primary, BakimateColors.accentTeal]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.goLoginGradient}
            >
              <Ionicons name="log-in" size={24} color="#fff" />
              <Text style={styles.goLoginText}>{t("go_to_login")}</Text>
            </LinearGradient>
          </Pressable>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <MeshBackdrop isDark={isDark} />

      {deleteAccountBusy ? (
        <View style={styles.deleteBusyOverlay} pointerEvents="auto">
          <ActivityIndicator color={BakimateColors.accentTeal} size="large" />
          <Text style={[styles.deleteBusyText, { color: headline }]}>{t("account_delete_working")}</Text>
        </View>
      ) : null}

      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarHeight + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          <ScreenHeroHeader
            eyebrow={t("more_screen_eyebrow")}
            title={t("tab_more")}
            subtitle={t("more_screen_tagline")}
            headlineColor={headline}
            mutedColor={muted}
            marginBottom={12}
          />

          {/* Identity */}
          <GlassSurface isDark={isDark} style={styles.identityGlass} contentStyle={styles.identityInner}>
            <View style={styles.identityStripeWrap}>
              <LinearGradient
                colors={[BakimateColors.primary, BakimateColors.accentTeal]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
            </View>
            <View style={styles.identityMain}>
              <PersonAvatar name={user.name ?? user.email} size="lg" kind="customer" />
              <View style={styles.identityTextCol}>
                {user.name ? (
                  <Text style={[styles.identityName, { color: headline }]} numberOfLines={1}>
                    {user.name}
                  </Text>
                ) : null}
                <Text style={[styles.identityEmail, { color: muted }]} numberOfLines={1}>
                  {user.email}
                </Text>
                {hasPremiumAccess ? (
                  <View style={styles.proPill}>
                    <Ionicons name="diamond" size={12} color={BakimateColors.accentTeal} />
                    <Text style={styles.proPillText}>{t("more_pro_badge_label")}</Text>
                  </View>
                ) : (
                  <Text style={[styles.identityHint, { color: muted }]}>{t("more_identity_hint_free")}</Text>
                )}
              </View>
            </View>
          </GlassSurface>

          <Text style={[styles.sectionLabel, { color: muted }]}>{t("more_section_workspace")}</Text>
          <View style={styles.grid}>
            <PictogramTile
              icon="storefront"
              label={t("more_nav_shop_settings")}
              isDark={isDark}
              onPress={() => router.push("/shop-settings")}
            />
            <PictogramTile
              icon={hasPremiumAccess ? "diamond" : "diamond-outline"}
              label={t("paywall_title")}
              tone={hasPremiumAccess ? BakimateColors.success : "#FBBF24"}
              isDark={isDark}
              onPress={() => router.push("/paywall")}
            />
          </View>

          <Text style={[styles.sectionLabel, styles.sectionLabelSpaced, { color: muted }]}>
            {t("more_section_look")}
          </Text>
          <View style={styles.grid}>
            <PictogramTile
              icon={
                themePref === "dark"
                  ? "moon"
                  : themePref === "light"
                    ? "sunny"
                    : "contrast"
              }
              label={
                themePref === "dark"
                  ? t("theme_dark")
                  : themePref === "light"
                    ? t("theme_light")
                    : t("theme_system")
              }
              isDark={isDark}
              onPress={() => setThemePickerOpen(true)}
            />
            <PictogramTile
              icon="language"
              label={i18n.language.startsWith("ms") ? t("lang_ms") : t("lang_en")}
              isDark={isDark}
              onPress={() => setLangPickerOpen(true)}
            />
            <PictogramTile
              icon="mic"
              label={t(voiceSttLabel)}
              isDark={isDark}
              onPress={() => setVoiceSttPickerOpen(true)}
            />
          </View>

          {subscriptionLine ? (
            <>
              <Text style={[styles.sectionLabel, styles.sectionLabelSpaced, { color: muted }]}>
                {t("more_section_plan")}
              </Text>
              <GlassSurface
                isDark={isDark}
                style={[
                  styles.planGlass,
                  subscriptionExpired && {
                    borderColor: BakimateColors.danger + "AA",
                  },
                ]}
                contentStyle={styles.planInner}
              >
                <Ionicons
                  name={subscriptionExpired ? "alert-circle" : "calendar"}
                  size={22}
                  color={subscriptionExpired ? BakimateColors.danger : BakimateColors.accentTeal}
                />
                <Text
                  style={[
                    styles.statusText,
                    { color: subscriptionExpired ? BakimateColors.danger : headline },
                  ]}
                  numberOfLines={4}
                >
                  {subscriptionLine}
                </Text>
              </GlassSurface>
            </>
          ) : null}

          <Text style={[styles.sectionLabel, styles.sectionLabelSpaced, { color: muted }]}>
            {t("more_section_legal")}
          </Text>
          <GlassSurface isDark={isDark} style={styles.legalGlass} contentStyle={styles.legalInner}>
            <Text style={[styles.deleteAccountBody, { color: muted }]}>{t("more_legal_privacy_terms_hint")}</Text>
            <View style={styles.legalLinkRow}>
              <Pressable
                onPress={() => void Linking.openURL(getPrivacyPolicyUrl())}
                accessibilityRole="link"
                accessibilityLabel={t("legal_privacy_policy")}
                style={({ pressed }) => [styles.legalLinkBtn, { opacity: pressed ? 0.75 : 1 }]}
              >
                <Ionicons name="shield-checkmark-outline" size={18} color={BakimateColors.accentTeal} />
                <Text style={[styles.legalLinkText, { color: BakimateColors.accentTeal }]}>
                  {t("legal_privacy_policy")}
                </Text>
                <Ionicons name="open-outline" size={16} color={BakimateColors.accentTeal} />
              </Pressable>
              <Pressable
                onPress={() => void Linking.openURL(getTermsOfUseUrl())}
                accessibilityRole="link"
                accessibilityLabel={t("legal_terms_of_use")}
                style={({ pressed }) => [styles.legalLinkBtn, { opacity: pressed ? 0.75 : 1 }]}
              >
                <Ionicons name="document-text-outline" size={18} color={BakimateColors.accentTeal} />
                <Text style={[styles.legalLinkText, { color: BakimateColors.accentTeal }]}>
                  {t("legal_terms_of_use")}
                </Text>
                <Ionicons name="open-outline" size={16} color={BakimateColors.accentTeal} />
              </Pressable>
            </View>
          </GlassSurface>
          <GlassSurface
            isDark={isDark}
            style={[
              styles.deleteGlass,
              { borderColor: isDark ? "rgba(248, 113, 113, 0.35)" : "rgba(220, 38, 38, 0.28)" },
            ]}
            contentStyle={styles.deleteInner}
          >
            <View
              style={[
                styles.deleteIconBubble,
                {
                  borderColor: BakimateColors.danger + "55",
                  backgroundColor: BakimateColors.danger + "12",
                },
              ]}
            >
              <Ionicons name="trash-outline" size={22} color={BakimateColors.danger} />
            </View>
            <View style={styles.deleteCopy}>
              <Text style={[styles.deleteAccountTitle, { color: headline }]}>
                {t("account_delete_section_title")}
              </Text>
              <Text style={[styles.deleteAccountBody, { color: muted }]}>
                {t("account_delete_section_body")}
              </Text>
              <Pressable
                onPress={confirmDeleteAccount}
                disabled={deleteAccountBusy}
                accessibilityRole="button"
                accessibilityLabel={t("account_delete_execute")}
                style={({ pressed }) => [
                  styles.deletePrimaryBtn,
                  {
                    opacity: deleteAccountBusy ? 0.55 : pressed ? 0.92 : 1,
                    backgroundColor: BakimateColors.danger,
                  },
                ]}
              >
                <Ionicons name="trash" size={20} color="#fff" />
                <Text style={styles.deletePrimaryBtnText}>{t("account_delete_execute")}</Text>
              </Pressable>
              <Pressable
                onPress={() => void Linking.openURL(`${getWebsiteBaseUrl()}/delete-account`)}
                disabled={deleteAccountBusy}
                style={({ pressed }) => [
                  styles.deleteAccountBtn,
                  { opacity: pressed || deleteAccountBusy ? 0.75 : 1, borderColor: BakimateColors.danger },
                ]}
              >
                <Text style={[styles.deleteAccountBtnText, { color: BakimateColors.danger }]}>
                  {t("account_delete_open_site")}
                </Text>
                <Ionicons name="open-outline" size={18} color={BakimateColors.danger} />
              </Pressable>
            </View>
          </GlassSurface>

          <Text style={[styles.sectionLabel, styles.sectionLabelSpaced, { color: muted }]}>
            {t("more_section_session")}
          </Text>
          <Pressable
            onPress={confirmSignOut}
            accessibilityRole="button"
            accessibilityLabel={t("sign_out")}
            style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}
          >
            <GlassSurface isDark={isDark} style={styles.signOutGlass} contentStyle={styles.signOutInner}>
              <View style={styles.signOutLeft}>
                <View
                  style={[
                    styles.signOutIconRing,
                    {
                      borderColor: BakimateColors.danger + "44",
                      backgroundColor: BakimateColors.danger + "14",
                    },
                  ]}
                >
                  <Ionicons name="log-out-outline" size={22} color={BakimateColors.danger} />
                </View>
                <Text style={[styles.signOutLabel, { color: headline }]}>{t("sign_out")}</Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color={muted} />
            </GlassSurface>
          </Pressable>
        </ScrollView>
      </SafeAreaView>

      {/* Theme picker */}
      <BottomSheet visible={themePickerOpen} onClose={() => setThemePickerOpen(false)} isDark={isDark} compact>
        <Text style={[styles.pickerTitle, { color: headline }]}>{t("appearance")}</Text>
        <Text style={[styles.pickerHint, { color: muted }]}>{t("theme_follow_device_hint")}</Text>
        <View style={styles.pickerGrid}>
          {(
            [
              { key: "system" as ColorSchemePreference, icon: "contrast" as const, label: t("theme_system") },
              { key: "light" as ColorSchemePreference, icon: "sunny" as const, label: t("theme_light") },
              { key: "dark" as ColorSchemePreference, icon: "moon" as const, label: t("theme_dark") },
            ]
          ).map((opt) => {
            const selected = themePref === opt.key;
            return (
              <PictogramTile
                key={opt.key}
                icon={opt.icon}
                label={opt.label}
                tone={selected ? BakimateColors.accentTeal : undefined}
                isDark={isDark}
                onPress={() => {
                  setThemePref(opt.key);
                  setThemePickerOpen(false);
                }}
                style={
                  selected
                    ? {
                        borderColor: BakimateColors.accentTeal,
                        borderWidth: 2,
                      }
                    : undefined
                }
              />
            );
          })}
        </View>
      </BottomSheet>

      {/* Voice STT language picker */}
      <BottomSheet
        visible={voiceSttPickerOpen}
        onClose={() => setVoiceSttPickerOpen(false)}
        isDark={isDark}
        compact
      >
        <Text style={[styles.pickerTitle, { color: headline }]}>{t("voice_stt_setting")}</Text>
        <Text style={[styles.pickerHint, { color: muted }]}>{t("voice_speak_hint")}</Text>
        <View style={styles.pickerGrid}>
          {VOICE_STT_LOCALE_OPTIONS.map((opt) => {
            const selected = voiceSttLocale === opt.key;
            return (
              <PictogramTile
                key={opt.key}
                icon="mic"
                label={t(opt.labelKey)}
                tone={selected ? BakimateColors.accentTeal : undefined}
                isDark={isDark}
                onPress={() => {
                  setVoiceSttLocale(opt.key as VoiceSttLocalePreference);
                  setVoiceSttPickerOpen(false);
                }}
                style={
                  selected
                    ? {
                        borderColor: BakimateColors.accentTeal,
                        borderWidth: 2,
                      }
                    : undefined
                }
              />
            );
          })}
        </View>
      </BottomSheet>

      {/* Language picker */}
      <BottomSheet visible={langPickerOpen} onClose={() => setLangPickerOpen(false)} isDark={isDark} compact>
        <Text style={[styles.pickerTitle, { color: headline }]}>{t("language")}</Text>
        <View style={styles.pickerGrid}>
          {(
            [
              { code: "en", label: t("lang_en") },
              { code: "ms", label: t("lang_ms") },
            ]
          ).map((opt) => {
            const selected = i18n.language.startsWith(opt.code);
            return (
              <PictogramTile
                key={opt.code}
                icon="language"
                label={opt.label}
                tone={selected ? BakimateColors.accentTeal : undefined}
                isDark={isDark}
                onPress={() => {
                  void i18n.changeLanguage(opt.code);
                  setLangPickerOpen(false);
                }}
                style={
                  selected
                    ? {
                        borderColor: BakimateColors.accentTeal,
                        borderWidth: 2,
                      }
                    : undefined
                }
              />
            );
          })}
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  deleteBusyOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 28,
  },
  deleteBusyText: { marginTop: 4, fontSize: 14, fontWeight: "800", textAlign: "center" },
  safe: { flex: 1, backgroundColor: "transparent", paddingHorizontal: 20 },

  scrollContent: {
    paddingTop: 4,
    flexGrow: 1,
  },

  identityGlass: { marginBottom: 16 },
  identityInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingLeft: 6,
    paddingRight: 18,
  },
  identityStripeWrap: {
    width: 5,
    alignSelf: "stretch",
    minHeight: 84,
    borderRadius: 4,
    overflow: "hidden",
    marginRight: 16,
  },
  identityMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: 14, minWidth: 0 },
  identityTextCol: { flex: 1, minWidth: 0 },
  identityName: { fontSize: 19, fontWeight: "900", letterSpacing: -0.3 },
  identityEmail: { marginTop: 3, fontSize: 13, fontWeight: "700" },
  identityHint: { marginTop: 8, fontSize: 12, fontWeight: "700", lineHeight: 17 },
  proPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(46, 196, 182, 0.16)",
  },
  proPillText: { fontWeight: "900", fontSize: 11, color: BakimateColors.accentTeal },

  sectionLabel: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  sectionLabelSpaced: { marginTop: 18 },

  grid: { flexDirection: "row", gap: 12, marginBottom: 4 },

  planGlass: { marginBottom: 2 },
  planInner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    padding: 18,
  },
  statusText: { flex: 1, fontWeight: "800", fontSize: 13, lineHeight: 19 },

  signOutGlass: { marginBottom: 14 },
  signOutInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  signOutLeft: { flexDirection: "row", alignItems: "center", gap: 14, flex: 1, minWidth: 0 },
  signOutIconRing: {
    width: 44,
    height: 44,
    borderRadius: 15,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  signOutLabel: { fontSize: 16, fontWeight: "900", letterSpacing: -0.2 },

  legalGlass: { marginBottom: 12 },
  legalInner: { padding: 16, gap: 12 },
  legalLinkRow: { gap: 10 },
  legalLinkBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
  },
  legalLinkText: { flex: 1, fontWeight: "800", fontSize: 15 },
  deleteGlass: { marginBottom: 12 },
  deleteInner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    padding: 18,
  },
  deleteIconBubble: {
    width: 44,
    height: 44,
    borderRadius: 15,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteCopy: { flex: 1, minWidth: 0 },
  deleteAccountTitle: { fontSize: 16, fontWeight: "900" },
  deleteAccountBody: { marginTop: 6, fontSize: 13, fontWeight: "700", lineHeight: 18 },
  deletePrimaryBtn: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    alignSelf: "stretch",
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 14,
  },
  deletePrimaryBtnText: { fontWeight: "900", fontSize: 15, color: "#fff" },

  deleteAccountBtn: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    alignSelf: "flex-start",
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    backgroundColor: "transparent",
  },
  deleteAccountBtnText: { fontWeight: "900", fontSize: 14 },

  goLoginGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 22,
    paddingVertical: 18,
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
  goLoginText: { color: "#fff", fontWeight: "900", fontSize: 16 },

  pickerTitle: { fontSize: 20, fontWeight: "900", marginBottom: 6 },
  pickerHint: { fontSize: 13, fontWeight: "700", marginBottom: 12 },
  pickerGrid: { flexDirection: "row", gap: 12, marginTop: 4 },
});
