import { BakimateColors } from "@/constants/bakimate-theme";
import { StyleSheet, Text, View } from "react-native";

type Props = {
  /** Width and height of the square mark */
  size?: number;
};

/** In-app word-free mark — green tile with “B” (matches marketing logo.svg). */
export function BakimateLogoMark({ size = 80 }: Props) {
  const r = Math.round(size * 0.22);
  return (
    <View
      style={[
        styles.box,
        {
          width: size,
          height: size,
          borderRadius: r,
          backgroundColor: BakimateColors.primary,
        },
      ]}
      accessibilityRole="image"
      accessibilityLabel="BakiMate"
    >
      <Text style={[styles.letter, { fontSize: size * 0.44 }]}>B</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: "center",
    justifyContent: "center",
  },
  letter: {
    color: "#fff",
    fontWeight: "900",
    marginTop: -2,
  },
});
