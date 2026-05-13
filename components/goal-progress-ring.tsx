import { BakimateColors } from "@/constants/bakimate-theme";

import { StyleSheet, Text, View } from "react-native";

type Props = {
  ratio: number;
  label: string;
  subLabel?: string;
  isDark: boolean;
};

/** Thick rounded progress toward a Qist / instalment goal — no SVG dependency. */
export function GoalProgressRing({ ratio, label, subLabel, isDark }: Props) {
  const safe = Math.min(1, Math.max(0, ratio));
  const track = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)";
  const fill = BakimateColors.accentTeal;

  return (
    <View style={{ gap: 10 }}>
      <View style={styles.rowBetween}>
        <Text style={[styles.label, { color: isDark ? "#E2E8F0" : BakimateColors.secondary }]}>{label}</Text>
        <Text style={[styles.pct, { color: fill }]}>{Math.round(safe * 100)}%</Text>
      </View>
      <View style={[styles.track, { backgroundColor: track }]}>
        <View style={[styles.fill, { width: `${safe * 100}%`, backgroundColor: fill }]} />
      </View>
      {subLabel ? (
        <Text style={[styles.sub, { color: isDark ? BakimateColors.neutralTextMutedDark : BakimateColors.neutralText }]}>
          {subLabel}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  label: { fontSize: 14, fontWeight: "900", flex: 1 },
  pct: { fontSize: 17, fontWeight: "900", marginLeft: 8 },
  track: { height: 12, borderRadius: 999, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 999 },
  sub: { fontSize: 12, fontWeight: "700", lineHeight: 17 },
});
