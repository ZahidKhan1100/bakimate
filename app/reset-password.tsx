import { MeshBackdrop } from "@/components/ui/mesh-backdrop";
import { authApiErrorMessage, resetPasswordWithToken } from "@/lib/auth-api";
import { BakimateColors } from "@/constants/bakimate-theme";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
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

function firstParam(v: string | string[] | undefined): string {
  if (typeof v === "string") return v;
  if (Array.isArray(v) && typeof v[0] === "string") return v[0];
  return "";
}

export default function ResetPasswordScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string; email?: string }>();
  const token = useMemo(() => firstParam(params.token), [params.token]);
  const emailParam = useMemo(() => {
    const raw = firstParam(params.email);
    if (!raw) return "";
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }, [params.email]);

  const scheme = useColorScheme();
  const theme = scheme === "dark" ? "dark" : "light";
  const isDark = theme === "dark";
  const headline = Colors[theme].text;
  const muted = isDark ? BakimateColors.neutralTextMutedDark : BakimateColors.neutralText;
  const inputBorder = isDark ? BakimateColors.glassBorderDark : "rgba(15, 23, 42, 0.12)";

  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [busy, setBusy] = useState(false);

  const missingLink = !token || !emailParam;

  const onSubmit = async () => {
    if (missingLink) return;
    if (password.length < 8) {
      Alert.alert(t("error"), t("auth_password_min"));
      return;
    }
    if (password !== password2) {
      Alert.alert(t("error"), t("auth_password_mismatch"));
      return;
    }
    setBusy(true);
    try {
      const res = await resetPasswordWithToken({
        email: emailParam,
        token,
        password,
        password_confirmation: password2,
      });
      Alert.alert(t("auth_reset_success_title"), res.message, [{ text: t("ok"), onPress: () => router.replace("/login") }]);
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
          <Text style={[styles.title, { color: headline }]}>{t("auth_reset_title")}</Text>
          {missingLink ? (
            <Text style={[styles.sub, { color: muted }]}>{t("auth_reset_missing_params")}</Text>
          ) : (
            <>
              <Text style={[styles.sub, { color: muted }]}>{t("auth_reset_subtitle")}</Text>
              <Text style={[styles.emailLine, { color: headline }]} numberOfLines={1}>
                {emailParam}
              </Text>

              <Text style={[styles.label, { color: muted }]}>{t("auth_field_password_new")}</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder={t("auth_field_password_new")}
                placeholderTextColor={muted}
                style={[styles.input, { color: headline, borderColor: inputBorder }]}
              />

              <Text style={[styles.label, { color: muted }]}>{t("auth_field_password_confirm")}</Text>
              <TextInput
                value={password2}
                onChangeText={setPassword2}
                secureTextEntry
                placeholder={t("auth_field_password_confirm")}
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
                  <Text style={styles.primaryBtnText}>{t("auth_reset_submit")}</Text>
                )}
              </Pressable>
            </>
          )}

          <Pressable
            onPress={() => router.replace("/login")}
            accessibilityRole="button"
            style={({ pressed }) => [styles.secondaryLink, { opacity: pressed ? 0.75 : 1 }]}
          >
            <Text style={[styles.secondaryLinkText, { color: BakimateColors.accentTeal }]}>
              {t("auth_back_to_login")}
            </Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1, backgroundColor: "transparent" },
  scroll: { paddingHorizontal: 28, paddingBottom: 36, paddingTop: 24 },
  title: { fontSize: 28, fontWeight: "900", letterSpacing: -0.5, marginBottom: 8 },
  sub: { fontSize: 15, fontWeight: "600", lineHeight: 21, marginBottom: 12 },
  emailLine: { fontSize: 15, fontWeight: "800", marginBottom: 16 },
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
  secondaryLink: { marginTop: 24, alignItems: "center" },
  secondaryLinkText: { fontSize: 16, fontWeight: "800" },
});
