import { BakimateColors } from "@/constants/bakimate-theme";
import { StyleSheet, View } from "react-native";

/** Soft gradient orbs behind glass UI (HabiMate-style depth). */
export function MeshBackdrop({ isDark }: { isDark: boolean }) {
  const base = isDark ? BakimateColors.backgroundDark : BakimateColors.backgroundLight;
  const teal = isDark ? BakimateColors.meshTealDark : BakimateColors.meshTealLight;
  const green = isDark ? BakimateColors.meshGreenDark : BakimateColors.meshGreenLight;
  const mist = isDark ? "rgba(255, 255, 255, 0.035)" : "rgba(148, 163, 184, 0.12)";

  return (
    <View style={[StyleSheet.absoluteFillObject, { backgroundColor: base }]} pointerEvents="none">
      <View style={[styles.orb, styles.orbTR, { backgroundColor: teal }]} />
      <View style={[styles.orbWide, styles.orbBL, { backgroundColor: green }]} />
      <View style={[styles.orbSm, styles.orbMid, { backgroundColor: mist }]} />
    </View>
  );
}

const R = 200;
const styles = StyleSheet.create({
  orb: {
    position: "absolute",
    width: R,
    height: R,
    borderRadius: R / 2,
  },
  orbWide: {
    position: "absolute",
    width: R * 1.35,
    height: R * 1.35,
    borderRadius: (R * 1.35) / 2,
  },
  orbSm: {
    position: "absolute",
    width: 148,
    height: 148,
    borderRadius: 74,
  },
  orbTR: { top: -R * 0.15, right: -R * 0.2 },
  orbBL: { bottom: "10%", left: -R * 0.45 },
  orbMid: { top: "34%", left: "6%" },
});
