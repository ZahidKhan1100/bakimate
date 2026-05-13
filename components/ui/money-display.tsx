import { BakimateColors } from "@/constants/bakimate-theme";
import { formatMoneyMinor } from "@/lib/money";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, type TextStyle } from "react-native";

type Tone = "debt" | "paid" | "neutral";
type Size = "huge" | "large" | "medium";

type Props = {
  sen: number;
  currencyCode: string;
  /** Color semantic. `debt` = red (customer owes), `paid` = green, `neutral` = primary text. */
  tone?: Tone;
  size?: Size;
  /** Overrides the auto-color (use for muted hero captions). */
  color?: string;
  align?: TextStyle["textAlign"];
};

const SIZE_STYLES: Record<Size, TextStyle> = {
  huge: { fontSize: 40, fontWeight: "900", letterSpacing: -1.6, lineHeight: 44 },
  large: { fontSize: 28, fontWeight: "900", letterSpacing: -1, lineHeight: 32 },
  medium: { fontSize: 20, fontWeight: "900", letterSpacing: -0.4, lineHeight: 24 },
};

function toneColor(tone: Tone, isDark = false): string {
  switch (tone) {
    case "debt":
      return isDark ? "#F87171" : BakimateColors.danger;
    case "paid":
      return BakimateColors.success;
    case "neutral":
    default:
      return BakimateColors.secondary;
  }
}

/**
 * Single source of truth for the big money number shown on a card.
 * Pairs the currency symbol with bold numerals; tone gives shop owners
 * an at-a-glance read (red = they owe me, green = paid up).
 */
export function MoneyDisplay({
  sen,
  currencyCode,
  tone = "neutral",
  size = "huge",
  color,
  align = "left",
}: Props) {
  const { i18n } = useTranslation();
  const finalColor = color ?? toneColor(tone);
  return (
    <Text style={[styles.base, SIZE_STYLES[size], { color: finalColor, textAlign: align }]}>
      {formatMoneyMinor(sen, currencyCode, i18n.language)}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: { includeFontPadding: false },
});
