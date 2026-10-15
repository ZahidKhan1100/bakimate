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

/** Frosted panel: blur + translucent fill + luminous rim border + deep shadow. */
export function GlassSurface({ children, style, contentStyle, isDark }: GlassSurfaceProps) {
  const intensity = Platform.select({
    ios: isDark ? 68 : 86,
    android: isDark ? 52 : 64,
    default: 56,
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
      {/* Top rim light — gives the premium "light hitting glass edge" look */}
      <View style={[styles.rimLight, { opacity: isDark ? 0.35 : 0.9 }]} pointerEvents="none" />
      <View style={[styles.inner, contentStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    borderRadius: 28,
    borderWidth: 1,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 18 },
        shadowOpacity: 0.22,
        shadowRadius: 36,
      },
      android: { elevation: 12 },
      default: {},
    }),
  },
  blur: { ...StyleSheet.absoluteFillObject },
  fill: { ...StyleSheet.absoluteFillObject },
  rimLight: {
    position: "absolute",
    top: 0,
    left: 24,
    right: 24,
    height: 1,
    backgroundColor: "#fff",
    borderRadius: 1,
  },
  inner: {
    position: "relative",
    zIndex: 1,
  },
});
