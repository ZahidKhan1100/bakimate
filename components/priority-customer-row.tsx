import { PersonAvatar } from "@/components/ui/person-avatar";
import { BakimateColors } from "@/constants/bakimate-theme";
import { Colors } from "@/constants/theme";
import { formatMoneyMinor } from "@/lib/money";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "@/components/ui/text";

type Props = {
  id: number;
  name: string;
  balanceSen: number;
  currencyCode: string;
  isDark: boolean;
  overdueLabel?: string;
  onPress: () => void;
  onWhatsApp: () => void;
  isLast?: boolean;
};

/** Home “call today” row — name + overdue + amount stacked; WhatsApp on the right. */
export function PriorityCustomerRow({
  id,
  name,
  balanceSen,
  currencyCode,
  isDark,
  overdueLabel,
  onPress,
  onWhatsApp,
  isLast = false,
}: Props) {
  const headline = Colors[isDark ? "dark" : "light"].text;
  const muted = isDark ? BakimateColors.neutralTextMutedDark : BakimateColors.neutralText;
  const debtColor = isDark ? "#FB923C" : BakimateColors.danger;
  const separator = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)";

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={name}
      style={({ pressed }) => [
        styles.root,
        !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: separator },
        { opacity: pressed ? 0.88 : 1 },
      ]}
    >
      <PersonAvatar name={name} customerId={id} kind="customer" size="sm" />

      <View style={styles.body}>
        <Text style={[styles.name, { color: headline }]} numberOfLines={2}>
          {name}
        </Text>
        {overdueLabel ? (
          <View
            style={[
              styles.overduePill,
              {
                backgroundColor: isDark ? "rgba(248, 113, 113, 0.18)" : "rgba(220, 38, 38, 0.1)",
                borderColor: isDark ? "rgba(248, 113, 113, 0.35)" : "rgba(220, 38, 38, 0.25)",
              },
            ]}
          >
            <Ionicons name="time-outline" size={12} color={BakimateColors.danger} />
            <Text style={[styles.overdueText, { color: BakimateColors.danger }]}>{overdueLabel}</Text>
          </View>
        ) : null}
        <Text style={[styles.amount, { color: debtColor }]} numberOfLines={1}>
          {formatMoneyMinor(balanceSen, currencyCode)}
        </Text>
      </View>

      <Pressable
        onPress={onWhatsApp}
        accessibilityRole="button"
        accessibilityLabel="WhatsApp"
        hitSlop={10}
        style={({ pressed }) => [
          styles.waBtn,
          {
            opacity: pressed ? 0.85 : 1,
            shadowColor: "#25D366",
          },
        ]}
      >
        <Ionicons name="logo-whatsapp" size={24} color="#fff" />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  body: { flex: 1, minWidth: 0, gap: 6 },
  name: { fontSize: 16, fontWeight: "800", letterSpacing: -0.15, lineHeight: 21 },
  overduePill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  overdueText: { fontSize: 13, fontWeight: "800" },
  amount: { fontSize: 20, fontWeight: "900", letterSpacing: -0.5 },
  waBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#25D366",
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
});
