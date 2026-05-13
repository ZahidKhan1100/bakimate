import { ShopProfileEditor } from "@/components/shop-profile-editor";
import { MeshBackdrop } from "@/components/ui/mesh-backdrop";
import { BakimateColors } from "@/constants/bakimate-theme";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useSessionStore } from "@/stores/session-store";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

const BOTTOM_PAD = Platform.OS === "ios" ? 36 : 28;

export default function ShopSettingsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const token = useSessionStore((s) => s.token);
  const raw = useColorScheme();
  const theme = raw === "dark" ? "dark" : "light";
  const isDark = theme === "dark";
  const headline = Colors[theme].text;
  const muted = isDark ? BakimateColors.neutralTextMutedDark : BakimateColors.neutralText;

  useEffect(() => {
    if (!token) {
      router.replace("/(tabs)/more");
    }
  }, [token]);

  if (!token) {
    return null;
  }

  return (
    <View style={styles.flex}>
      <MeshBackdrop isDark={isDark} />

      <SafeAreaView style={styles.safe} edges={["top", "left", "right", "bottom"]}>
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
          style={styles.flex}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: BOTTOM_PAD + Math.max(insets.bottom, 4),
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
        >
          <View style={styles.heroHeader}>
            <View style={styles.heroDisc}>
              <Ionicons name="storefront" size={36} color={BakimateColors.accentTeal} />
            </View>
            <Text style={[styles.title, { color: headline }]}>
              {t("screen_shop_settings_title")}
            </Text>
            <Text style={[styles.subtitle, { color: muted }]} numberOfLines={3}>
              {t("screen_shop_settings_subtitle")}
            </Text>
          </View>
          <ShopProfileEditor />
        </ScrollView>
      </SafeAreaView>
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

  heroHeader: { alignItems: "center", paddingTop: 4, paddingBottom: 14, gap: 8 },
  heroDisc: {
    width: 84,
    height: 84,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(46, 196, 182, 0.14)",
    marginBottom: 4,
  },
  title: { fontSize: 26, fontWeight: "900", letterSpacing: -0.5, textAlign: "center" },
  subtitle: { fontSize: 13, fontWeight: "700", lineHeight: 19, textAlign: "center" },
});
