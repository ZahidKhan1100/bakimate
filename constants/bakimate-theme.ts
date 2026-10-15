/**
 * BakiMate palette — dark glass / fintech premium edition.
 * Deep navy canvas, luminous glass borders, teal + gold dual accent.
 */
export const BakimateColors = {
  primary: "#00875A",
  /** Primary UI accent — tabs, highlights, glass rim */
  accentTeal: "#2EC4B6",
  /** Premium gold accent — badges, star ratings, pro highlights */
  accentGold: "#F4B942",
  secondary: "#0A1628",
  /** Light app canvas */
  backgroundLight: "#EEF2FA",
  /** Dark app canvas — deep navy for fintech premium feel */
  backgroundDark: "#07101F",
  /** Legacy single-token background */
  background: "#EEF2FA",
  danger: "#DE350B",
  success: "#36B37E",
  neutralText: "#64748B",
  /** Cooler, more refined muted text on dark backgrounds */
  neutralTextMutedDark: "#8899B8",
  white: "#FFFFFF",
  border: "rgba(15, 23, 42, 0.1)",
  /** Glass stroke — light mode */
  glassBorderLight: "rgba(255, 255, 255, 0.85)",
  /** Glass stroke — dark mode, more luminous for premium depth */
  glassBorderDark: "rgba(255, 255, 255, 0.18)",
  /** Frost overlay on top of BlurView */
  glassFillLight: "rgba(255, 255, 255, 0.72)",
  /** Richer dark fill for fintech depth */
  glassFillDark: "rgba(8, 15, 36, 0.68)",
  meshTealLight: "rgba(46, 196, 182, 0.18)",
  meshTealDark: "rgba(46, 196, 182, 0.15)",
  meshGreenLight: "rgba(0, 135, 90, 0.12)",
  meshGreenDark: "rgba(0, 135, 90, 0.1)",
  /** Subtle gold warmth for dark mesh backdrops */
  meshGoldDark: "rgba(244, 185, 66, 0.07)",
} as const;

export type BakimateColorsType = typeof BakimateColors;
