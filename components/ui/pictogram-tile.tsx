import { BakimateColors } from "@/constants/bakimate-theme";
import { Colors } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { Platform, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from "react-native";

type Props = {
  onPress: () => void;
  icon: ComponentProps<typeof Ionicons>["name"];
  label: string;
  isDark: boolean;
  /** Tint applied to the icon. Defaults to accent teal. */
  tone?: string;
  style?: StyleProp<ViewStyle>;
};

/** Square pictogram tile for grid layouts (More tab in Phase 2). */
export function PictogramTile({ onPress, icon, label, isDark, tone, style }: Props) {
  const fg = Colors[isDark ? "dark" : "light"].text;
  const iconColor = tone ?? BakimateColors.accentTeal;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.tile,
        {
          backgroundColor: isDark ? "rgba(15, 23, 42, 0.55)" : "rgba(255, 255, 255, 0.94)",
          borderColor: isDark ? BakimateColors.glassBorderDark : BakimateColors.border,
          opacity: pressed ? 0.9 : 1,
          ...Platform.select({
            ios: {
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: isDark ? 0.4 : 0.08,
              shadowRadius: 10,
            },
            android: { elevation: 2 },
            default: {},
          }),
        },
        style,
      ]}
    >
      <Ionicons name={icon} size={32} color={iconColor} />
      <Text style={[styles.label, { color: fg }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 12,
    minHeight: 110,
  },
  label: { fontSize: 13, fontWeight: "800", textAlign: "center" },
});
