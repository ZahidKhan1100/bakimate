import { BakimateColors } from "@/constants/bakimate-theme";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import type { ComponentProps } from "react";
import { Platform, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

type Variant = "primary" | "success" | "danger" | "neutral";
type Size = "md" | "lg" | "xl";

type Props = {
  onPress: () => void;
  icon: ComponentProps<typeof Ionicons>["name"];
  /** Optional short label. Omit for pictogram-only buttons. */
  label?: string;
  /** Accessibility label (required if `label` is missing). */
  accessibilityLabel?: string;
  variant?: Variant;
  size?: Size;
  /** Adds a light haptic on press (default `true`). */
  haptic?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

function colorsFor(variant: Variant): { bg: string; fg: string; shadow: string } {
  switch (variant) {
    case "success":
      return { bg: BakimateColors.success, fg: "#fff", shadow: BakimateColors.success };
    case "danger":
      return { bg: BakimateColors.danger, fg: "#fff", shadow: BakimateColors.danger };
    /** Subtle idle state — OK on light UIs only; on dark mesh it disappears (prefer `primary` + `disabled`). */
    case "neutral":
      return { bg: "rgba(15, 23, 42, 0.06)", fg: BakimateColors.secondary, shadow: "transparent" };
    case "primary":
    default:
      return { bg: BakimateColors.primary, fg: "#fff", shadow: BakimateColors.primary };
  }
}

const SIZES = {
  md: { minHeight: 56, iconSize: 22, fontSize: 13, padV: 12, padH: 16, gap: 8, radius: 18 },
  lg: { minHeight: 80, iconSize: 30, fontSize: 14, padV: 16, padH: 18, gap: 10, radius: 22 },
  xl: { minHeight: 120, iconSize: 44, fontSize: 16, padV: 20, padH: 18, gap: 12, radius: 26 },
} as const;

/**
 * Primary visual button used across the redesign. Picks color by semantic
 * variant, pairs a large icon with an optional one-word label, and adds
 * a subtle drop shadow so it reads as a tappable target from across a stall.
 */
export function BigActionButton({
  onPress,
  icon,
  label,
  accessibilityLabel,
  variant = "primary",
  size = "lg",
  haptic = true,
  disabled,
  style,
}: Props) {
  const sz = SIZES[size];
  const c = colorsFor(variant);
  const handle = () => {
    if (disabled) return;
    if (haptic) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    onPress();
  };

  return (
    <Pressable
      onPress={handle}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [
        styles.root,
        {
          minHeight: sz.minHeight,
          backgroundColor: c.bg,
          borderRadius: sz.radius,
          paddingVertical: sz.padV,
          paddingHorizontal: sz.padH,
          opacity: disabled ? 0.5 : pressed ? 0.92 : 1,
          ...(c.shadow === "transparent"
            ? {}
            : Platform.select({
                ios: {
                  shadowColor: c.shadow,
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.32,
                  shadowRadius: 14,
                },
                android: { elevation: 6 },
                default: {},
              })),
        },
        style,
      ]}
    >
      <View style={[styles.body, { gap: sz.gap }]}>
        <Ionicons name={icon} size={sz.iconSize} color={c.fg} />
        {label ? (
          <Text
            numberOfLines={1}
            style={[styles.label, { color: c.fg, fontSize: sz.fontSize }]}
          >
            {label}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: "center", justifyContent: "center" },
  body: { alignItems: "center", justifyContent: "center" },
  label: { fontWeight: "900", letterSpacing: 0.2 },
});
