import { MeshBackdrop } from "@/components/ui/mesh-backdrop";
import { BakimateColors } from "@/constants/bakimate-theme";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { apiErrorMessage } from "@/lib/api";
import { loginWithAppleIdToken, loginWithEmail, loginWithGoogleIdToken } from "@/lib/auth-api";
import { isGoogleOAuthConfigured } from "@/lib/auth-google-config";
import { applyAuthResponseToSession } from "@/lib/auth-session";
import { setPendingVerificationEmail } from "@/lib/auth-verification-pending";
import { getGoogleIdTokenFromAuthResponse } from "@/lib/google-auth-session";
import {
  buildGoogleIdTokenAuthRequestPartialConfig,
  getGoogleOAuthClientIds,
  shouldUseGoogleAuthProxy,
} from "@/lib/google-auth";
import { setGoogleOauthReturnHref } from "@/lib/google-oauth-return-path";
import { Ionicons } from "@expo/vector-icons";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Google from "expo-auth-session/providers/google";
import { BakimateLogoMark } from "@/components/bakimate-logo-mark";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import axios from "axios";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const scheme = useColorScheme();
  const theme = scheme === "dark" ? "dark" : "light";
  const isDark = theme === "dark";
  const headline = Colors[theme].text;
  const muted = isDark ? BakimateColors.neutralTextMutedDark : BakimateColors.neutralText;
  const inputBorder = isDark ? BakimateColors.glassBorderDark : "rgba(15, 23, 42, 0.12)";

  const ids = getGoogleOAuthClientIds();
  const googleReady = isGoogleOAuthConfigured(ids);
  const useProxy = shouldUseGoogleAuthProxy();

  const googleOAuthRequestConfig = useMemo(
    () => buildGoogleIdTokenAuthRequestPartialConfig(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      ids.googleIosClientId,
      ids.googleAndroidClientId,
      ids.googleWebClientId,
      ids.googleExpoClientId,
      useProxy,
    ],
  );

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest(googleOAuthRequestConfig);

  const [googleBusy, setGoogleBusy] = useState(false);
  const [appleBusy, setAppleBusy] = useState(false);
  const [emailBusy, setEmailBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const handledGoogleIdTokenRef = useRef<string | null>(null);

  const oauthBusy = googleBusy || appleBusy || emailBusy;

  useEffect(() => {
    void AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
  }, []);

  useEffect(() => {
    async function consumeGoogle() {
      if (!response) return;
      if (response.type === "cancel") {
        setGoogleBusy(false);
        return;
      }
      if (response.type === "error") {
        const p = response.params as Record<string, string | undefined> | undefined;
        const msg =
          typeof p?.error_description === "string"
            ? p.error_description
            : typeof p?.error === "string"
              ? p.error
              : t("login_try_again");
        Alert.alert(t("login_failed_title"), msg);
        setGoogleBusy(false);
        return;
      }
      if (response.type !== "success") {
        Alert.alert(t("login_failed_title"), t("login_try_again"));
        setGoogleBusy(false);
        return;
      }
      const idTok = getGoogleIdTokenFromAuthResponse(response);
      if (!idTok) {
        Alert.alert(
          t("login_failed_title"),
          Platform.OS === "android" ? t("google_no_id_token_android") : t("google_no_id_token"),
        );
        setGoogleBusy(false);
        return;
      }
      if (handledGoogleIdTokenRef.current === idTok) return;
      handledGoogleIdTokenRef.current = idTok;
      try {
        const auth = await loginWithGoogleIdToken(idTok);
        applyAuthResponseToSession(auth);
      } catch (e) {
        Alert.alert(t("login_failed_title"), apiErrorMessage(e));
      } finally {
        setGoogleBusy(false);
      }
    }
    void consumeGoogle();
  }, [response, t]);

  const signInApple = async () => {
    setAppleBusy(true);
    try {
      const cred = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      const idTok = cred.identityToken;
      if (!idTok) {
        Alert.alert(t("login_failed_title"), t("apple_no_identity_token"));
        return;
      }
      const gn = cred.fullName?.givenName ?? "";
      const fn = cred.fullName?.familyName ?? "";
      const full = [gn, fn].filter(Boolean).join(" ").trim() || undefined;
      const auth = await loginWithAppleIdToken(idTok, full);
      applyAuthResponseToSession(auth);
    } catch (e: unknown) {
      if (
        typeof e === "object" &&
        e !== null &&
        "code" in e &&
        (e as { code?: string }).code === "ERR_REQUEST_CANCELED"
      ) {
        return;
      }
      Alert.alert(t("login_failed_title"), apiErrorMessage(e));
    } finally {
      setAppleBusy(false);
    }
  };

  const signInGooglePress = async () => {
    if (!googleReady) {
      Alert.alert(t("oauth_not_configured_title"), t("oauth_not_configured_body"));
      return;
    }
    if (!request) {
      Alert.alert(t("login_failed_title"), t("oauth_not_ready_yet"));
      return;
    }
    setGoogleBusy(true);
    try {
      if (!useProxy) {
        await setGoogleOauthReturnHref("/login");
      }
      const res = await promptAsync();
      if (res?.type !== "success") {
        setGoogleBusy(false);
      }
    } catch (e) {
      Alert.alert(t("login_failed_title"), apiErrorMessage(e));
      setGoogleBusy(false);
    }
  };

  const signInEmail = async () => {
    const em = email.trim().toLowerCase();
    if (!em || !em.includes("@")) {
      Alert.alert(t("error"), t("auth_invalid_email"));
      return;
    }
    if (!password) {
      Alert.alert(t("error"), t("auth_password_required"));
      return;
    }
    setEmailBusy(true);
    try {
      const auth = await loginWithEmail({ email: em, password });
      applyAuthResponseToSession(auth);
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 403) {
        const body = e.response?.data as { email_verified?: boolean } | undefined;
        if (body?.email_verified === false) {
          await setPendingVerificationEmail(em);
          router.push("/verify-email");
          return;
        }
      }
      Alert.alert(t("login_failed_title"), apiErrorMessage(e));
    } finally {
      setEmailBusy(false);
    }
  };

  return (
    <View style={styles.root}>
      <MeshBackdrop isDark={isDark} />
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.heroWrap}>
            <View style={styles.iconFrame}>
              <BakimateLogoMark size={132} />
            </View>
            <Text style={[styles.brand, { color: headline }]}>{t("app_name")}</Text>
            <Text style={[styles.tagline, { color: muted }]}>{t("login_headline")}</Text>
          </View>

          <View style={styles.actionsWrap}>
            <Text style={[styles.inputLabel, { color: muted }]}>{t("auth_field_email")}</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder={t("auth_field_email")}
              placeholderTextColor={muted}
              editable={!oauthBusy}
              style={[styles.emailInput, { color: headline, borderColor: inputBorder }]}
            />
            <Text style={[styles.inputLabel, { color: muted }]}>{t("auth_field_password")}</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder={t("auth_field_password")}
              placeholderTextColor={muted}
              editable={!oauthBusy}
              style={[styles.emailInput, { color: headline, borderColor: inputBorder }]}
            />
            <Pressable
              onPress={() => void signInEmail()}
              disabled={oauthBusy}
              accessibilityRole="button"
              accessibilityLabel={t("auth_sign_in_email")}
              style={({ pressed }) => [
                styles.emailPrimaryBtn,
                { opacity: emailBusy ? 0.88 : pressed ? 0.92 : 1 },
              ]}
            >
              {emailBusy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.emailPrimaryBtnText}>{t("auth_sign_in_email")}</Text>
              )}
            </Pressable>

            <View style={styles.authLinksRow}>
              <Pressable
                onPress={() => router.push("/forgot-password")}
                disabled={oauthBusy}
                accessibilityRole="link"
              >
                <Text style={[styles.authLinkText, { color: BakimateColors.accentTeal }]}>{t("auth_forgot_link")}</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push("/register")}
                disabled={oauthBusy}
                accessibilityRole="link"
              >
                <Text style={[styles.authLinkText, { color: BakimateColors.accentTeal }]}>{t("auth_register_link")}</Text>
              </Pressable>
            </View>

            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: isDark ? "rgba(148,163,184,0.35)" : "rgba(15,23,42,0.12)" }]} />
              <Text style={[styles.dividerText, { color: muted }]}>{t("auth_email_divider")}</Text>
              <View style={[styles.dividerLine, { backgroundColor: isDark ? "rgba(148,163,184,0.35)" : "rgba(15,23,42,0.12)" }]} />
            </View>

            <Pressable
              onPress={() => void signInGooglePress()}
              disabled={oauthBusy}
              accessibilityRole="button"
              accessibilityLabel={t("continue_with_google")}
              style={({ pressed }) => [
                styles.googleBtn,
                {
                  opacity: googleBusy ? 0.85 : pressed ? 0.92 : googleReady ? 1 : 0.55,
                },
              ]}
            >
              {googleBusy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <View style={styles.googleMark}>
                    <Ionicons name="logo-google" size={28} color="#4285F4" />
                  </View>
                  <Text style={styles.googleBtnText} numberOfLines={1}>
                    {t("continue_with_google")}
                  </Text>
                </>
              )}
            </Pressable>

            {Platform.OS === "ios" && appleAvailable ? (
              <View pointerEvents={oauthBusy ? "none" : "auto"} style={{ opacity: oauthBusy ? 0.65 : 1 }}>
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                  buttonStyle={
                    isDark
                      ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                      : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
                  }
                  cornerRadius={22}
                  style={styles.appleBtnNative}
                  onPress={() => void signInApple()}
                />
              </View>
            ) : null}

            {Platform.OS === "ios" && appleAvailable && appleBusy ? (
              <ActivityIndicator style={{ marginTop: 10 }} color={BakimateColors.primary} />
            ) : null}

            {Platform.OS === "android" ? (
              <Text style={[styles.androidHint, { color: muted }]}>{t("apple_ios_only_hint")}</Text>
            ) : null}
          </View>

          {(!googleReady || (useProxy && googleReady)) && (
            <View style={styles.helpWrap}>
              <Pressable
                onPress={() => setHelpOpen((p) => !p)}
                accessibilityRole="button"
                style={({ pressed }) => [styles.helpToggle, { opacity: pressed ? 0.7 : 1 }]}
              >
                <Ionicons
                  name={helpOpen ? "chevron-up" : "information-circle"}
                  size={18}
                  color={muted}
                />
                <Text style={[styles.helpToggleText, { color: muted }]} numberOfLines={1}>
                  {t("oauth_not_configured_title")}
                </Text>
              </Pressable>

              {helpOpen ? (
                <View
                  style={[
                    styles.helpCard,
                    {
                      backgroundColor: isDark
                        ? "rgba(15, 23, 42, 0.55)"
                        : "rgba(255, 255, 255, 0.94)",
                      borderColor: isDark ? BakimateColors.glassBorderDark : BakimateColors.border,
                    },
                  ]}
                >
                  {!googleReady ? (
                    <Text style={[styles.helpBody, { color: muted }]}>{t("google_env_hint")}</Text>
                  ) : null}
                  {useProxy && googleReady ? (
                    <Text style={[styles.helpBody, { color: muted }]}>{t("google_proxy_hint")}</Text>
                  ) : null}
                </View>
              ) : null}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1, backgroundColor: "transparent" },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 36,
    paddingBottom: 36,
    justifyContent: "space-between",
  },

  heroWrap: { alignItems: "center", paddingTop: 24, paddingBottom: 24, gap: 14 },
  iconFrame: {
    width: 132,
    height: 132,
    borderRadius: 32,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
      },
      android: { elevation: 8 },
      default: {},
    }),
  },
  brand: { fontSize: 42, fontWeight: "900", letterSpacing: -0.8 },
  tagline: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
    textAlign: "center",
    maxWidth: 320,
  },

  actionsWrap: { gap: 14, paddingTop: 8 },
  inputLabel: { fontSize: 12, fontWeight: "800", marginBottom: 6, marginTop: 2 },
  emailInput: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontWeight: "600",
    fontSize: 17,
  },
  emailPrimaryBtn: {
    marginTop: 6,
    backgroundColor: BakimateColors.accentTeal,
    borderRadius: 22,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  emailPrimaryBtnText: { color: "#fff", fontWeight: "900", fontSize: 17 },
  authLinksRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
    paddingHorizontal: 2,
  },
  authLinkText: { fontSize: 14, fontWeight: "800" },
  dividerRow: { flexDirection: "row", alignItems: "center", marginVertical: 4 },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth },
  dividerText: { paddingHorizontal: 12, fontSize: 13, fontWeight: "800" },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 22,
    minHeight: 64,
    paddingVertical: 12,
    paddingLeft: 12,
    paddingRight: 24,
    gap: 14,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.18,
        shadowRadius: 14,
      },
      android: { elevation: 4 },
      default: {},
    }),
  },
  googleMark: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  googleBtnText: { flex: 1, color: "#1F2937", fontWeight: "900", fontSize: 17, textAlign: "left" },
  appleBtnNative: { width: "100%", height: 64 },

  androidHint: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
    textAlign: "center",
  },

  helpWrap: { marginTop: 20, gap: 10, alignItems: "center" },
  helpToggle: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6 },
  helpToggleText: { fontSize: 12, fontWeight: "800" },
  helpCard: {
    padding: 14,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    width: "100%",
  },
  helpBody: { fontSize: 12, fontWeight: "600", lineHeight: 18, marginTop: 4 },
});
