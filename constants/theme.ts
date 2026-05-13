import { BakimateColors } from "./bakimate-theme";
import { Platform } from "react-native";

export const Colors = {
  light: {
    text: BakimateColors.secondary,
    background: BakimateColors.backgroundLight,
    tint: BakimateColors.accentTeal,
    icon: BakimateColors.neutralText,
    tabIconDefault: "#94A3B8",
    tabIconSelected: BakimateColors.accentTeal,
    /** Glass layers sit on mesh; keep mostly transparent for chrome that expects a card token */
    card: "rgba(255, 255, 255, 0.01)",
    danger: BakimateColors.danger,
    success: BakimateColors.success,
  },
  dark: {
    text: "#F1F5F9",
    background: BakimateColors.backgroundDark,
    tint: BakimateColors.accentTeal,
    icon: BakimateColors.neutralTextMutedDark,
    tabIconDefault: "#64748B",
    tabIconSelected: BakimateColors.accentTeal,
    card: "rgba(15, 23, 42, 0.01)",
    danger: "#F87171",
    success: BakimateColors.success,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
