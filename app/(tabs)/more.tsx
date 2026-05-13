import { BottomSheet } from "@/components/ui/bottom-sheet";
import { MeshBackdrop } from "@/components/ui/mesh-backdrop";
import { PersonAvatar } from "@/components/ui/person-avatar";
import { PictogramTile } from "@/components/ui/pictogram-tile";
import { BakimateColors } from "@/constants/bakimate-theme";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { formatSubscriptionExpiryDateTime } from "@/lib/format-subscription-expiry";
import { Qk } from "@/lib/hooks/query-keys";
import { usePremiumRecordingAccess } from "@/lib/hooks/usePremiumRecordingAccess";
import { getPremiumEntitlementIdentifier } from "@/lib/revenuecat-settings";
import { fetchShopProfile } from "@/lib/shop-api";
import { useSessionStore } from "@/stores/session-store";
import { useUiPreferencesStore, type ColorSchemePreference } from "@/stores/ui-preferences-store";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const TAB_PAD = Platform.OS === "ios" ? 108 : 96;

export default function MoreScreen() {
  const { t, i18n } = useTranslation();
  const raw = useColorScheme();
  const theme = raw === "dark" ? "dark" : "light";
  const isDark = theme === "dark";
  const headline = Colors[theme].text;
  const muted = isDark ? BakimateColors.neutralTextMutedDark : BakimateColors.neutralText;

  const token = useSessionStore((s) => s.token);
  const user = useSessionStore((s) => s.user);
  const logout = useSessionStore((s) => s.logout);

  const shopQuery = useQuery({
    queryKey: Qk.shopProfile,
    queryFn: fetchShopProfile,
    enabled: Boolean(token && user),
    staleTime: 30 * 1000,
  });

  const premium = usePremiumRecordingAccess(Boolean(token));
  const entitlementName = getPremiumEntitlementIdentifier();
  const proActive = Boolean(token && premium.data?.requiresPremium && premium.data?.entitled);

  const themePref = useUiPreferencesStore((s) => s.colorSchemePreference);
  const setThemePref = useUiPreferencesStore((s) => s.setColorSchemePreference);

  const [themePickerOpen, setThemePickerOpen] = useState(false);
  const [langPickerOpen, setLangPickerOpen] = useState(false);

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

  if (!token || !user) {
    return (
      <View style={styles.flex}>
        <MeshBackdrop isDark={isDark} />
        <SafeAreaView style={styles.safe} edges={["top"]}>
          <Text style={[styles.title, { color: headline }]}>{t("tab_more")}</Text>
          <Text style={[styles.signedOutBody, { color: muted }]}>{t("more_sign_in_via_login")}</Text>
          <Pressable
            onPress={() => router.replace("/login")}
            style={({ pressed }) => [styles.goLogin, { opacity: pressed ? 0.9 : 1 }]}
          >
            <Ionicons name="log-in" size={24} color="#fff" />
            <Text style={styles.goLoginText}>{t("go_to_login")}</Text>
          </Pressable>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <MeshBackdrop isDark={isDark} />

      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: TAB_PAD, gap: 14 }}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.title, { color: headline }]}>{t("tab_more")}</Text>

          {/* Identity hero */}
          <View
            style={[
              styles.identityCard,
              {
                backgroundColor: isDark ? "rgba(15, 23, 42, 0.55)" : "rgba(255, 255, 255, 0.94)",
                borderColor: isDark ? BakimateColors.glassBorderDark : BakimateColors.border,
              },
            ]}
          >
            <PersonAvatar name={user.name ?? user.email} size="lg" kind="customer" />
            <View style={{ flex: 1, minWidth: 0, marginLeft: 14 }}>
              {user.name ? (
                <Text style={[styles.identityName, { color: headline }]} numberOfLines={1}>
                  {user.name}
                </Text>
              ) : null}
              <Text style={[styles.identityEmail, { color: muted }]} numberOfLines={1}>
                {user.email}
              </Text>
              {proActive ? (
                <View style={styles.proPill}>
                  <Ionicons name="diamond" size={12} color={BakimateColors.accentTeal} />
                  <Text style={styles.proPillText}>{entitlementName}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Pictogram grid */}
          <View style={styles.grid}>
            <PictogramTile
              icon="storefront"
              label={t("more_nav_shop_settings")}
              isDark={isDark}
              onPress={() => router.push("/shop-settings")}
            />
            <PictogramTile
              icon={proActive ? "diamond" : "diamond-outline"}
              label={t("paywall_title")}
              tone={proActive ? BakimateColors.success : "#FBBF24"}
              isDark={isDark}
              onPress={() => router.push("/paywall")}
            />
          </View>

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
          </View>

          <View style={styles.grid}>
            <PictogramTile
              icon="log-out"
              label={t("sign_out")}
              tone={BakimateColors.danger}
              isDark={isDark}
              onPress={confirmSignOut}
            />
            <View style={styles.gridSpacer} />
          </View>

          {/* Subscription status banner */}
          {subscriptionLine ? (
            <View
              style={[
                styles.statusCard,
                {
                  backgroundColor: subscriptionExpired
                    ? "rgba(239, 68, 68, 0.10)"
                    : isDark
                      ? "rgba(15, 23, 42, 0.55)"
                      : "rgba(255, 255, 255, 0.94)",
                  borderColor: subscriptionExpired
                    ? BakimateColors.danger
                    : isDark
                      ? BakimateColors.glassBorderDark
                      : BakimateColors.border,
                },
              ]}
            >
              <Ionicons
                name={subscriptionExpired ? "alert-circle" : "calendar"}
                size={20}
                color={subscriptionExpired ? BakimateColors.danger : BakimateColors.accentTeal}
              />
              <Text
                style={[
                  styles.statusText,
                  { color: subscriptionExpired ? BakimateColors.danger : headline },
                ]}
                numberOfLines={3}
              >
                {subscriptionLine}
              </Text>
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>

      {/* Theme picker */}
      <BottomSheet visible={themePickerOpen} onClose={() => setThemePickerOpen(false)} isDark={isDark}>
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

      {/* Language picker */}
      <BottomSheet visible={langPickerOpen} onClose={() => setLangPickerOpen(false)} isDark={isDark}>
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
  safe: { flex: 1, backgroundColor: "transparent", paddingHorizontal: 20 },
  title: { fontSize: 32, fontWeight: "900", letterSpacing: -0.6, marginBottom: 4 },

  identityCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
  },
  identityName: { fontSize: 18, fontWeight: "900" },
  identityEmail: { marginTop: 2, fontSize: 13, fontWeight: "700" },
  proPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(46, 196, 182, 0.16)",
  },
  proPillText: { fontWeight: "900", fontSize: 11, color: BakimateColors.accentTeal },

  grid: { flexDirection: "row", gap: 12 },
  gridSpacer: { flex: 1 },

  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
  },
  statusText: { flex: 1, fontWeight: "800", fontSize: 13, lineHeight: 18 },

  signedOutBody: { fontSize: 15, fontWeight: "700", marginVertical: 18, lineHeight: 22 },
  goLogin: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 22,
    paddingVertical: 18,
    backgroundColor: BakimateColors.primary,
  },
  goLoginText: { color: "#fff", fontWeight: "900", fontSize: 16 },

  pickerTitle: { fontSize: 20, fontWeight: "900", marginBottom: 6 },
  pickerHint: { fontSize: 13, fontWeight: "700", marginBottom: 12 },
  pickerGrid: { flexDirection: "row", gap: 12, marginTop: 4 },
});
