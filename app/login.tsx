import { MeshBackdrop } from "@/components/ui/mesh-backdrop";
import { BakimateColors } from "@/constants/bakimate-theme";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { loginWithAppleIdToken, loginWithDemo, loginWithGoogleIdToken } from "@/lib/auth-api";
import { isGoogleOAuthConfigured } from "@/lib/auth-google-config";
import { applyAuthResponseToSession } from "@/lib/auth-session";
import {
  buildGoogleIdTokenAuthRequestPartialConfig,
  getGoogleOAuthClientIds,
  shouldUseGoogleAuthProxy,
} from "@/lib/google-auth";
import { setGoogleOauthReturnHref } from "@/lib/google-oauth-return-path";
import { Ionicons } from "@expo/vector-icons";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Google from "expo-auth-session/providers/google";
import { Image } from "expo-image";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useEffect, useMemo, useState } from "react";
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

WebBrowser.maybeCompleteAuthSession();

const APP_ICON = require("@/assets/images/icon.jpg");

export default function LoginScreen() {
  const { t } = useTranslation();
  const scheme = useColorScheme();
  const theme = scheme === "dark" ? "dark" : "light";
  const isDark = theme === "dark";
  const headline = Colors[theme].text;
  const muted = isDark ? BakimateColors.neutralTextMutedDark : BakimateColors.neutralText;

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
  const [demoBusy, setDemoBusy] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    void AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
  }, []);

  const oauthErrorDetail = useCallback((e: unknown) => {
    const err = e as { response?: { data?: { message?: unknown } }; message?: unknown };
    const m = err?.response?.data?.message ?? err?.message;
    return typeof m === "string" ? m : String(e);
  }, []);

  useEffect(() => {
    async function consumeGoogle() {
      if (!response) return;
      if (response.type === "cancel") {
        setGoogleBusy(false);
        return;
      }
      if (response.type !== "success") {
        Alert.alert(t("login_failed_title"), t("login_try_again"));
        setGoogleBusy(false);
        return;
      }
      const idTok = typeof response.params.id_token === "string" ? response.params.id_token : undefined;
      if (!idTok) {
        Alert.alert(t("login_failed_title"), t("google_no_id_token"));
        setGoogleBusy(false);
        return;
      }
      try {
        const auth = await loginWithGoogleIdToken(idTok);
        applyAuthResponseToSession(auth);
      } catch (e) {
        Alert.alert(t("login_failed_title"), oauthErrorDetail(e));
      } finally {
        setGoogleBusy(false);
      }
    }
    void consumeGoogle();
  }, [response, t, oauthErrorDetail]);

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
      Alert.alert(t("login_failed_title"), oauthErrorDetail(e));
    } finally {
      setAppleBusy(false);
    }
  };

  const signInDemo = async () => {
    setDemoBusy(true);
    try {
      const auth = await loginWithDemo();
      applyAuthResponseToSession(auth);
    } catch (e) {
      Alert.alert(t("login_failed_title"), oauthErrorDetail(e));
    } finally {
      setDemoBusy(false);
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
      Alert.alert(t("login_failed_title"), oauthErrorDetail(e));
      setGoogleBusy(false);
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
              <Image source={APP_ICON} style={styles.iconImg} contentFit="cover" />
            </View>
            <Text style={[styles.brand, { color: headline }]}>{t("app_name")}</Text>
            <Text style={[styles.tagline, { color: muted }]}>{t("login_headline")}</Text>
          </View>

          <View style={styles.actionsWrap}>
            <Pressable
              onPress={() => void signInGooglePress()}
              disabled={googleBusy || appleBusy}
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
              <View
                pointerEvents={appleBusy ? "none" : "auto"}
                style={{ opacity: appleBusy ? 0.75 : 1 }}
              >
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

            {/*
              Small "Sign in for App Review" link. Calls POST /api/auth/demo.
              Backend returns 403 unless DEMO_LOGIN_ENABLED=true on the server
              (only set on the production env while the app is under review),
              so real users tapping this will just see a friendly error.
            */}
            <Pressable
              onPress={() => void signInDemo()}
              disabled={demoBusy || googleBusy || appleBusy}
              accessibilityRole="button"
              accessibilityLabel={t("demo_signin_label")}
              style={({ pressed }) => [
                styles.demoLink,
                { opacity: demoBusy ? 0.85 : pressed ? 0.6 : 1 },
              ]}
            >
              {demoBusy ? (
                <ActivityIndicator color={muted} />
              ) : (
                <>
                  <Ionicons name="key-outline" size={14} color={muted} />
                  <Text style={[styles.demoLinkText, { color: muted }]} numberOfLines={1}>
                    {t("demo_signin_label")}
                  </Text>
                </>
              )}
            </Pressable>
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
  iconImg: { width: "100%", height: "100%" },
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

  demoLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingTop: 16,
    paddingBottom: 4,
  },
  demoLinkText: { fontSize: 12, fontWeight: "700", letterSpacing: 0.2 },

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
