import { MeshBackdrop } from "@/components/ui/mesh-backdrop";
import { authApiErrorMessage, requestPasswordReset } from "@/lib/auth-api";
import { BakimateColors } from "@/constants/bakimate-theme";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const scheme = useColorScheme();
  const theme = scheme === "dark" ? "dark" : "light";
  const isDark = theme === "dark";
  const headline = Colors[theme].text;
  const muted = isDark ? BakimateColors.neutralTextMutedDark : BakimateColors.neutralText;
  const inputBorder = isDark ? BakimateColors.glassBorderDark : "rgba(15, 23, 42, 0.12)";

  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async () => {
    const em = email.trim().toLowerCase();
    if (!em || !em.includes("@")) {
      Alert.alert(t("error"), t("auth_invalid_email"));
      return;
    }
    setBusy(true);
    try {
      const res = await requestPasswordReset(em);
      Alert.alert(t("auth_forgot_sent_title"), res.message, [{ text: t("ok"), onPress: () => router.back() }]);
    } catch (e) {
      Alert.alert(t("login_failed_title"), authApiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.root}>
      <MeshBackdrop isDark={isDark} />
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel={t("back")}
            style={({ pressed }) => [styles.backRow, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Ionicons name="chevron-back" size={22} color={headline} />
            <Text style={[styles.backText, { color: headline }]}>{t("auth_back_to_login")}</Text>
          </Pressable>

          <Text style={[styles.title, { color: headline }]}>{t("auth_forgot_title")}</Text>
          <Text style={[styles.sub, { color: muted }]}>{t("auth_forgot_subtitle")}</Text>

          <Text style={[styles.label, { color: muted }]}>{t("auth_field_email")}</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder={t("auth_field_email")}
            placeholderTextColor={muted}
            style={[styles.input, { color: headline, borderColor: inputBorder }]}
          />

          <Pressable
            onPress={() => void onSubmit()}
            disabled={busy}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.primaryBtn,
              { opacity: busy ? 0.85 : pressed ? 0.92 : 1 },
            ]}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>{t("auth_forgot_submit")}</Text>
            )}
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1, backgroundColor: "transparent" },
  scroll: { paddingHorizontal: 28, paddingBottom: 36, paddingTop: 8 },
  backRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 20 },
  backText: { fontSize: 16, fontWeight: "800" },
  title: { fontSize: 28, fontWeight: "900", letterSpacing: -0.5, marginBottom: 8 },
  sub: { fontSize: 15, fontWeight: "600", lineHeight: 21, marginBottom: 20 },
  label: { fontSize: 12, fontWeight: "800", marginBottom: 6, marginTop: 10 },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    fontWeight: "600",
    fontSize: 17,
    marginBottom: 4,
  },
  primaryBtn: {
    marginTop: 22,
    backgroundColor: BakimateColors.accentTeal,
    borderRadius: 22,
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: { color: "#fff", fontWeight: "900", fontSize: 17 },
});
