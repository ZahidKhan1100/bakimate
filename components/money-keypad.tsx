import { BakimateColors } from "@/constants/bakimate-theme";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  valueSen: number;
  onChangeSen: (next: number) => void;
};

/**
 * Large touch targets for shop floor / fast entry (amounts in sen).
 */
export function MoneyKeypad({ valueSen, onChangeSen }: Props) {
  const append = (digit: number) => {
    const next = valueSen * 10 + digit;
    if (next > 9_999_999_999) return;
    onChangeSen(next);
  };

  const backspace = () => {
    onChangeSen(Math.floor(valueSen / 10));
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {[1, 2, 3].map((d) => (
          <Key label={String(d)} onPress={() => append(d)} key={d} />
        ))}
      </View>
      <View style={styles.row}>
        {[4, 5, 6].map((d) => (
          <Key label={String(d)} onPress={() => append(d)} key={d} />
        ))}
      </View>
      <View style={styles.row}>
        {[7, 8, 9].map((d) => (
          <Key label={String(d)} onPress={() => append(d)} key={d} />
        ))}
      </View>
      <View style={styles.row}>
        <Key label="⌫" onPress={backspace} danger />
        <Key label="0" onPress={() => append(0)} />
        <Key label="C" onPress={() => onChangeSen(0)} danger />
      </View>
    </View>
  );
}

function Key({
  label,
  onPress,
  danger,
}: {
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.key,
        { opacity: pressed ? 0.9 : 1, backgroundColor: danger ? "#fff" : BakimateColors.primary },
      ]}
    >
      <Text style={[styles.keyText, { color: danger ? BakimateColors.danger : "#fff" }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  row: { flexDirection: "row", gap: 10 },
  key: {
    flex: 1,
    minHeight: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: BakimateColors.border,
  },
  keyText: { fontSize: 22, fontWeight: "900" },
});
