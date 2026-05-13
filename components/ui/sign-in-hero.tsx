import { BigActionButton } from "@/components/ui/big-action-button";
import { BakimateColors } from "@/constants/bakimate-theme";
import { Colors } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Platform, StyleSheet, Text, View } from "react-native";

type Props = {
  isDark: boolean;
  /** Optional headline overriding the default sign-in prompt. */
  title?: string;
};

/**
 * Friendly, full-area "sign in" prompt used across tabs when the user is
 * signed out. Big lock pictogram + short prompt + a single teal pictogram
 * "Go to login" button.
 */
export function SignInHero({ isDark, title }: Props) {
  const { t } = useTranslation();
  const headline = Colors[isDark ? "dark" : "light"].text;

  return (
    <View style={styles.root}>
      <View style={styles.disc}>
        <Ionicons name="lock-closed" size={52} color={BakimateColors.accentTeal} />
      </View>
      <Text style={[styles.title, { color: headline }]}>{title ?? t("sign_in_prompt")}</Text>
      <BigActionButton
        onPress={() => router.push("/login")}
        icon="log-in"
        variant="primary"
        size="lg"
        label={t("sign_in_action")}
        accessibilityLabel={t("sign_in_action")}
        style={styles.cta}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
    paddingHorizontal: 32,
    paddingTop: 64,
    gap: 16,
  },
  disc: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(46, 196, 182, 0.14)",
    ...Platform.select({
      ios: {
        shadowColor: BakimateColors.accentTeal,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.18,
        shadowRadius: 16,
      },
      android: { elevation: 4 },
      default: {},
    }),
  },
  title: {
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.3,
    textAlign: "center",
    maxWidth: 280,
  },
  cta: { alignSelf: "stretch", marginTop: 12 },
});
