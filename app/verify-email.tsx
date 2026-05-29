import { MeshBackdrop } from "@/components/ui/mesh-backdrop";
import { checkEmailVerified, resendVerificationEmail } from "@/lib/auth-api";
import type { AuthResponse } from "@/lib/api-types";
import { applyAuthResponseToSession } from "@/lib/auth-session";
import {
  clearPendingVerificationEmail,
  getPendingVerificationEmail,
} from "@/lib/auth-verification-pending";
import { BakimateColors } from "@/constants/bakimate-theme";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const POLL_MS = 8000;

function isAuthWithToken(r: unknown): r is AuthResponse {
  if (typeof r !== "object" || r === null || !("token" in r)) {
    return false;
  }
  const tok = (r as AuthResponse).token;
  return typeof tok === "string" && tok.length > 0;
}

export default function VerifyEmailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ verified?: string }>();
  const scheme = useColorScheme();
  const theme = scheme === "dark" ? "dark" : "light";
  const isDark = theme === "dark";
  const headline = Colors[theme].text;
  const muted = isDark ? BakimateColors.neutralTextMutedDark : BakimateColors.neutralText;
  const inputBorder = isDark ? BakimateColors.glassBorderDark : "rgba(15, 23, 42, 0.12)";

  const [email, setEmail] = useState("");
  const [checking, setChecking] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const stored = await getPendingVerificationEmail();
      if (stored) setEmail(stored);
    })();
  }, []);

  const runCheck = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!email) return;
      const silent = Boolean(opts?.silent);
      if (!silent) {
        setChecking(true);
        setBanner(null);
      }
      try {
        const res = await checkEmailVerified(email);
        if ("email_verified" in res && res.email_verified === false) {
          if (!silent) {
            setBanner(t("auth_verify_still_waiting"));
          }
          return;
        }
        if (isAuthWithToken(res)) {
          await clearPendingVerificationEmail();
          applyAuthResponseToSession(res);
          setBanner(t("auth_verify_success_redirect"));
          setTimeout(() => {
            router.replace("/(tabs)");
          }, 600);
        }
      } catch {
        if (!silent) {
          setBanner(t("auth_verify_check_failed"));
        }
      } finally {
        if (!silent) {
          setChecking(false);
        }
      }
    },
    [email, router, t],
  );

  useEffect(() => {
    if (params.verified === "1" || params.verified === "true") {
      void runCheck({ silent: true });
    }
  }, [params.verified, runCheck]);

  useEffect(() => {
    if (!email) return;
    const id = setInterval(() => void runCheck({ silent: true }), POLL_MS);
    return () => clearInterval(id);
  }, [email, runCheck]);

  const onResend = async () => {
    if (!email) {
      Alert.alert(t("error"), t("auth_invalid_email"));
      return;
    }
    setResendBusy(true);
    setBanner(null);
    try {
      const r = await resendVerificationEmail(email);
      setBanner(r.message);
    } catch {
      setBanner(t("auth_verify_resend_failed"));
    } finally {
      setResendBusy(false);
    }
  };

  const openMail = () => {
    if (email) void Linking.openURL(`mailto:${email}`);
    else void Linking.openURL("mailto:");
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
          <View style={[styles.card, { borderColor: inputBorder }]}>
            <View style={[styles.iconCircle, { backgroundColor: BakimateColors.accentTeal + "22" }]}>
              <Ionicons name="mail-outline" size={40} color={BakimateColors.accentTeal} />
            </View>

            <Text style={[styles.title, { color: headline }]}>{t("auth_verify_title")}</Text>
            <Text style={[styles.sub, { color: muted }]}>{t("auth_verify_subtitle")}</Text>
            {email ? (
              <Text style={[styles.emailLine, { color: headline }]} numberOfLines={2}>
                {email}
              </Text>
            ) : (
              <Text style={[styles.sub, { color: muted }]}>{t("auth_verify_no_email_hint")}</Text>
            )}

            <Pressable
              onPress={openMail}
              disabled={!email}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.primaryBtn,
                { opacity: !email ? 0.5 : pressed ? 0.9 : 1 },
              ]}
            >
              <Text style={styles.primaryBtnText}>{t("auth_verify_open_mail")}</Text>
            </Pressable>

            <Pressable
              onPress={() => void runCheck()}
              disabled={checking || !email}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.secondaryBtn,
                { borderColor: inputBorder, opacity: checking ? 0.75 : pressed ? 0.88 : 1 },
              ]}
            >
              {checking ? (
                <ActivityIndicator color={BakimateColors.accentTeal} />
              ) : (
                <Text style={[styles.secondaryBtnText, { color: headline }]}>{t("auth_verify_tap_checked")}</Text>
              )}
            </Pressable>

            <Pressable onPress={() => void onResend()} disabled={resendBusy || !email} style={styles.resendWrap}>
              {resendBusy ? (
                <ActivityIndicator color={muted} />
              ) : (
                <Text style={[styles.resendText, { color: BakimateColors.accentTeal }]}>
                  {t("auth_verify_resend")}
                </Text>
              )}
            </Pressable>

            {banner ? (
              <View style={[styles.banner, { borderColor: inputBorder }]}>
                <Text style={[styles.bannerText, { color: muted }]}>{banner}</Text>
              </View>
            ) : null}
          </View>

          <Pressable
            onPress={async () => {
              await clearPendingVerificationEmail();
              router.replace("/login");
            }}
            accessibilityRole="button"
            style={({ pressed }) => [styles.backRow, { opacity: pressed ? 0.75 : 1 }]}
          >
            <Ionicons name="chevron-back" size={22} color={headline} />
            <Text style={[styles.backText, { color: headline }]}>{t("auth_back_to_login")}</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1, backgroundColor: "transparent" },
  scroll: { paddingHorizontal: 24, paddingVertical: 20 },
  card: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 22,
    alignItems: "center",
    backgroundColor: "rgba(46, 196, 182, 0.06)",
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: { fontSize: 26, fontWeight: "900", textAlign: "center", marginBottom: 8 },
  sub: { fontSize: 15, fontWeight: "600", textAlign: "center", lineHeight: 21 },
  emailLine: { fontSize: 16, fontWeight: "800", textAlign: "center", marginTop: 10, marginBottom: 6 },
  primaryBtn: {
    marginTop: 18,
    width: "100%",
    backgroundColor: BakimateColors.accentTeal,
    borderRadius: 18,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: { color: "#fff", fontWeight: "900", fontSize: 16 },
  secondaryBtn: {
    marginTop: 12,
    width: "100%",
    borderRadius: 18,
    borderWidth: 1,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnText: { fontWeight: "900", fontSize: 16 },
  resendWrap: { marginTop: 16, paddingVertical: 8 },
  resendText: { fontSize: 14, fontWeight: "800", textAlign: "center" },
  banner: {
    marginTop: 16,
    width: "100%",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  bannerText: { fontSize: 13, fontWeight: "700", textAlign: "center", lineHeight: 18 },
  backRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 24 },
  backText: { fontSize: 16, fontWeight: "800" },
});
