import { BakimateColors } from "@/constants/bakimate-theme";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

type Variant = "home" | "screen";

type Props = {
  /** Short uppercase label above the title */
  eyebrow?: string;
  title: string;
  subtitle?: string;
  headlineColor: string;
  mutedColor: string;
  trailing?: ReactNode;
  /** `home` = large app title; `screen` = tab / secondary screens */
  variant?: Variant;
  marginBottom?: number;
};

/**
 * Shared hero block: optional eyebrow, title, subtitle, optional trailing slot,
 * and the green → teal accent line (matches Home dashboard).
 */
export function ScreenHeroHeader({
  eyebrow,
  title,
  subtitle,
  headlineColor,
  mutedColor,
  trailing,
  variant = "screen",
  marginBottom = 18,
}: Props) {
  const titleStyle = variant === "home" ? styles.titleHome : styles.titleScreen;
  return (
    <View style={[styles.wrap, { marginBottom }]}>
      {eyebrow ? (
        <Text style={[styles.eyebrow, { color: BakimateColors.accentTeal }]} numberOfLines={1}>
          {eyebrow}
        </Text>
      ) : null}
      <View style={styles.titleRow}>
        <View style={styles.titleBlock}>
          <Text style={[titleStyle, { color: headlineColor }]} numberOfLines={2}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: mutedColor }]} numberOfLines={3}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {trailing}
      </View>
      <LinearGradient
        colors={[BakimateColors.primary, BakimateColors.accentTeal]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.accent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 4 },
  eyebrow: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 2.4,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  titleBlock: { flex: 1, minWidth: 0 },
  titleHome: {
    fontSize: 36,
    fontWeight: "900",
    letterSpacing: -1.2,
  },
  titleScreen: {
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: -1,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
    letterSpacing: -0.2,
  },
  accent: {
    marginTop: 18,
    height: 4,
    width: "100%",
    borderRadius: 2,
    opacity: 0.92,
  },
});
