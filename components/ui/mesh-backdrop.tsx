import { BakimateColors } from "@/constants/bakimate-theme";
import { StyleSheet, View } from "react-native";

/** Deep-field gradient orbs — fintech premium depth. */
export function MeshBackdrop({ isDark }: { isDark: boolean }) {
  const base = isDark ? BakimateColors.backgroundDark : BakimateColors.backgroundLight;
  const teal = isDark ? BakimateColors.meshTealDark : BakimateColors.meshTealLight;
  const green = isDark ? BakimateColors.meshGreenDark : BakimateColors.meshGreenLight;
  const mist = isDark ? "rgba(255, 255, 255, 0.025)" : "rgba(148, 163, 184, 0.1)";
  const gold = isDark ? BakimateColors.meshGoldDark : "rgba(244, 185, 66, 0.04)";
  const tealFar = isDark ? "rgba(46, 196, 182, 0.07)" : "rgba(46, 196, 182, 0.08)";

  return (
    <View style={[StyleSheet.absoluteFillObject, { backgroundColor: base }]} pointerEvents="none">
      {/* Primary teal orb — top right */}
      <View style={[styles.orb, styles.orbTR, { backgroundColor: teal }]} />
      {/* Green orb — bottom left */}
      <View style={[styles.orbWide, styles.orbBL, { backgroundColor: green }]} />
      {/* Mist — mid center-left */}
      <View style={[styles.orbSm, styles.orbMid, { backgroundColor: mist }]} />
      {/* Gold warmth — bottom right */}
      <View style={[styles.orbGold, styles.orbBR, { backgroundColor: gold }]} />
      {/* Far teal — top left, large and diffuse */}
      <View style={[styles.orbFar, styles.orbTL, { backgroundColor: tealFar }]} />
    </View>
  );
}

const R = 240;
const styles = StyleSheet.create({
  orb: {
    position: "absolute",
    width: R,
    height: R,
    borderRadius: R / 2,
  },
  orbWide: {
    position: "absolute",
    width: R * 1.4,
    height: R * 1.4,
    borderRadius: (R * 1.4) / 2,
  },
  orbSm: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
  },
  orbGold: {
    position: "absolute",
    width: R * 1.1,
    height: R * 1.1,
    borderRadius: (R * 1.1) / 2,
  },
  orbFar: {
    position: "absolute",
    width: R * 1.8,
    height: R * 1.8,
    borderRadius: (R * 1.8) / 2,
  },
  orbTR: { top: -R * 0.18, right: -R * 0.22 },
  orbBL: { bottom: "8%", left: -R * 0.48 },
  orbMid: { top: "36%", left: "8%" },
  orbBR: { bottom: "18%", right: -R * 0.3 },
  orbTL: { top: -R * 0.6, left: -R * 0.5 },
});
