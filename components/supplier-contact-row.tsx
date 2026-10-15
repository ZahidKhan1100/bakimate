import { PersonAvatar } from "@/components/ui/person-avatar";
import { BakimateColors } from "@/constants/bakimate-theme";
import { Colors } from "@/constants/theme";
import { formatMoneyMinor } from "@/lib/money";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "@/components/ui/text";

type Props = {
  name: string;
  phone: string | null;
  balanceSen: number;
  currencyCode: string;
  isDark: boolean;
  onPress: () => void;
  onLongPress?: () => void;
};

/** Flat contacts-style row for the suppliers tab. */
export function SupplierContactRow({
  name,
  phone,
  balanceSen,
  currencyCode,
  isDark,
  onPress,
  onLongPress,
}: Props) {
  const headline = Colors[isDark ? "dark" : "light"].text;
  const muted = isDark ? BakimateColors.neutralTextMutedDark : BakimateColors.neutralText;
  const separator = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)";
  const amountColor =
    balanceSen > 0
      ? isDark
        ? "#F87171"
        : BakimateColors.danger
      : balanceSen < 0
        ? BakimateColors.success
        : muted;

  const subline = phone?.trim() || null;
  const amountLabel = formatMoneyMinor(Math.abs(balanceSen), currencyCode);

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityLabel={name}
      style={({ pressed }) => [
        styles.root,
        { borderBottomColor: separator, opacity: pressed ? 0.72 : 1 },
      ]}
    >
      <PersonAvatar name={name} kind="supplier" size="sm" />
      <View style={styles.body}>
        <Text style={[styles.name, { color: headline }]} numberOfLines={1}>
          {name}
        </Text>
        {subline ? (
          <Text style={[styles.subline, { color: muted }]} numberOfLines={1}>
            {subline}
          </Text>
        ) : null}
      </View>
      <Text style={[styles.amount, { color: amountColor }]} numberOfLines={1}>
        {balanceSen > 0 ? amountLabel : balanceSen < 0 ? `+${amountLabel}` : amountLabel}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  body: { flex: 1, minWidth: 0 },
  name: { fontSize: 17, fontWeight: "600" },
  subline: { marginTop: 2, fontSize: 14, fontWeight: "400" },
  amount: { fontSize: 15, fontWeight: "700", maxWidth: 110, textAlign: "right" },
});
