import { BakimateColors } from "@/constants/bakimate-theme";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  currencyCode: string;
  /** Adds the given major-unit amount to the keypad value. */
  onAdd: (majorAmount: number) => void;
  isDark: boolean;
};

const PRESETS = [5, 10, 20, 50, 100] as const;

/**
 * Banknote pictogram chips. Tap adds (not replaces) so a shopkeeper can
 * count out RM 25 as "20 + 5" without using a decimal point.
 */
export function QuickAmountChips({ currencyCode, onAdd, isDark }: Props) {
  return (
    <View style={styles.row}>
      {PRESETS.map((n) => (
        <Pressable
          key={n}
          onPress={() => onAdd(n)}
          accessibilityRole="button"
          accessibilityLabel={`${currencyCode} ${n}`}
          style={({ pressed }) => [
            styles.chip,
            {
              backgroundColor: isDark ? "rgba(46, 196, 182, 0.16)" : "rgba(46, 196, 182, 0.14)",
              borderColor: BakimateColors.accentTeal,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Ionicons name="cash-outline" size={18} color={BakimateColors.accentTeal} />
          <Text style={styles.chipText}>+{n}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 44,
  },
  chipText: {
    fontWeight: "900",
    fontSize: 14,
    color: BakimateColors.accentTeal,
    letterSpacing: 0.2,
  },
});
