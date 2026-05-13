import { BakimateColors } from "@/constants/bakimate-theme";
import { Colors } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { Platform, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

type IoniconName = ComponentProps<typeof Ionicons>["name"];

type Props = {
  icon: IoniconName;
  title: string;
  body?: string;
  isDark: boolean;
  /** Optional arrow pointer hint — `"down-right"` for a bottom-right FAB, `"down"` for centered actions. */
  pointer?: "down" | "down-right";
  /** Optional accent tint for the icon disc (defaults to teal). */
  tone?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Visual empty state used by customers / suppliers / transaction lists.
 * Big pictogram + short title + optional body + an optional bouncing arrow
 * pointing at the FAB so non-readers know what to tap next.
 */
export function EmptyHero({ icon, title, body, isDark, pointer, tone, style }: Props) {
  const headline = Colors[isDark ? "dark" : "light"].text;
  const muted = isDark ? BakimateColors.neutralTextMutedDark : BakimateColors.neutralText;
  const accent = tone ?? BakimateColors.accentTeal;

  return (
    <View style={[styles.root, style]}>
      <View style={[styles.disc, { backgroundColor: `${accent}1F` }]}>
        <Ionicons name={icon} size={52} color={accent} />
      </View>
      <Text style={[styles.title, { color: headline }]}>{title}</Text>
      {body ? (
        <Text style={[styles.body, { color: muted }]} numberOfLines={4}>
          {body}
        </Text>
      ) : null}

      {pointer ? (
        <View
          style={[
            styles.pointer,
            pointer === "down-right" ? styles.pointerDownRight : styles.pointerDown,
          ]}
          pointerEvents="none"
        >
          <Ionicons
            name={pointer === "down-right" ? "arrow-down" : "arrow-down"}
            size={48}
            color={accent}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
    paddingHorizontal: 28,
    paddingTop: 56,
    gap: 12,
  },
  disc: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
      },
      android: { elevation: 2 },
      default: {},
    }),
  },
  title: {
    marginTop: 8,
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.4,
    textAlign: "center",
  },
  body: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
    textAlign: "center",
    maxWidth: 280,
  },
  pointer: { marginTop: 32 },
  pointerDown: { alignSelf: "center" },
  pointerDownRight: { alignSelf: "flex-end", marginRight: 12 },
});
