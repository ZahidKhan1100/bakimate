import { BakimateColors } from "@/constants/bakimate-theme";
import { BlurView } from "expo-blur";
import { type ReactNode } from "react";
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

type GlassSurfaceProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  isDark: boolean;
};

/** Frosted panel: blur + translucent fill + crisp border (parity with HabiMate `GlassPanel`). */
export function GlassSurface({ children, style, contentStyle, isDark }: GlassSurfaceProps) {
  const intensity = Platform.select({
    ios: isDark ? 50 : 76,
    android: isDark ? 40 : 52,
    default: 48,
  });

  const borderColor = isDark ? BakimateColors.glassBorderDark : BakimateColors.glassBorderLight;
  const fill = isDark ? BakimateColors.glassFillDark : BakimateColors.glassFillLight;

  return (
    <View style={[styles.outer, { borderColor }, style]}>
      <BlurView
        intensity={intensity}
        tint={isDark ? "dark" : "light"}
        style={styles.blur}
      />
      <View style={[styles.fill, { backgroundColor: fill }]} pointerEvents="none" />
      <View style={[styles.inner, contentStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    borderRadius: 26,
    borderWidth: 1,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#0f172a",
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.14,
        shadowRadius: 28,
      },
      android: { elevation: 10 },
      default: {},
    }),
  },
  blur: { ...StyleSheet.absoluteFillObject },
  fill: { ...StyleSheet.absoluteFillObject },
  inner: {
    position: "relative",
    zIndex: 1,
  },
});
