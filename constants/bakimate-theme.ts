/**
 * BakiMate palette + HabiMate-style glass (teal #2EC4B6, soft mesh, frosted panels).
 */
export const BakimateColors = {
  primary: "#00875A",
  /** HabiMate marketing / UI accent — tabs, highlights, glass rim */
  accentTeal: "#2EC4B6",
  secondary: "#0F172A",
  /** Light app canvas (matches HabiMate globals) */
  backgroundLight: "#F1F5F9",
  /** Dark app canvas */
  backgroundDark: "#0B1220",
  /** Legacy: navigation & screens that expect a single light background token */
  background: "#F1F5F9",
  danger: "#DE350B",
  success: "#36B37E",
  neutralText: "#64748B",
  neutralTextMutedDark: "#94A3B8",
  white: "#FFFFFF",
  border: "rgba(15, 23, 42, 0.1)",
  /** Glass stroke — light mode */
  glassBorderLight: "rgba(255, 255, 255, 0.7)",
  glassBorderDark: "rgba(255, 255, 255, 0.12)",
  /** Frost overlay on top of BlurView */
  glassFillLight: "rgba(255, 255, 255, 0.62)",
  glassFillDark: "rgba(15, 23, 42, 0.42)",
  meshTealLight: "rgba(46, 196, 182, 0.2)",
  meshTealDark: "rgba(46, 196, 182, 0.11)",
  meshGreenLight: "rgba(0, 135, 90, 0.12)",
  meshGreenDark: "rgba(0, 135, 90, 0.1)",
} as const;

export type BakimateColorsType = typeof BakimateColors;
