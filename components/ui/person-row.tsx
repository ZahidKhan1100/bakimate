import { BakimateColors } from "@/constants/bakimate-theme";
import { Colors } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { MoneyDisplay } from "./money-display";
import { PersonAvatar } from "./person-avatar";

type Props = {
  id: number;
  name: string;
  balanceSen: number;
  currencyCode: string;
  isDark: boolean;
  kind?: "customer" | "supplier";
  onPress: () => void;
  onLongPress?: () => void;
  /** Inline pictogram action (e.g. WhatsApp nudge on the priority list). */
  trailingAction?: ReactNode;
  /** Optional small subline rendered under the name (e.g. days overdue). */
  subline?: string;
  /** Color for the subline; default = muted. */
  sublineTone?: "muted" | "danger" | "success";
};

/**
 * The default row used on the Customers list, Suppliers list, and the
 * Priority list on Home. Photo + bold name + big colored amount + chevron.
 * Whole row is one tap target; share/delete live on long-press to keep
 * the visual surface uncluttered.
 */
export function PersonRow({
  id,
  name,
  balanceSen,
  currencyCode,
  isDark,
  kind = "customer",
  onPress,
  onLongPress,
  trailingAction,
  subline,
  sublineTone = "muted",
}: Props) {
  const headline = Colors[isDark ? "dark" : "light"].text;
  const muted = isDark ? BakimateColors.neutralTextMutedDark : BakimateColors.neutralText;
  const sublineColor =
    sublineTone === "danger"
      ? BakimateColors.danger
      : sublineTone === "success"
        ? BakimateColors.success
        : muted;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityLabel={name}
      style={({ pressed }) => [
        styles.root,
        {
          backgroundColor: isDark ? "rgba(15, 23, 42, 0.55)" : "rgba(255, 255, 255, 0.94)",
          opacity: pressed ? 0.94 : 1,
          ...Platform.select({
            ios: {
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: isDark ? 0.4 : 0.1,
              shadowRadius: 12,
            },
            android: { elevation: 3 },
            default: {},
          }),
        },
      ]}
    >
      <PersonAvatar name={name} customerId={kind === "customer" ? id : null} kind={kind} size="md" />

      <View style={styles.body}>
        <Text style={[styles.name, { color: headline }]} numberOfLines={1}>
          {name}
        </Text>
        {subline ? (
          <Text style={[styles.subline, { color: sublineColor }]} numberOfLines={1}>
            {subline}
          </Text>
        ) : null}
      </View>

      <View style={styles.amountWrap}>
        <MoneyDisplay
          sen={balanceSen}
          currencyCode={currencyCode}
          tone={balanceSen > 0 ? "debt" : "paid"}
          size="medium"
          align="right"
        />
      </View>

      {trailingAction ?? (
        <Ionicons name="chevron-forward" size={20} color={muted} style={styles.chevron} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 22,
    marginBottom: 10,
  },
  body: { flex: 1, minWidth: 0 },
  name: { fontSize: 18, fontWeight: "800", letterSpacing: -0.2 },
  subline: { marginTop: 2, fontSize: 12, fontWeight: "700" },
  amountWrap: { alignItems: "flex-end", justifyContent: "center" },
  chevron: { marginLeft: 2 },
});
