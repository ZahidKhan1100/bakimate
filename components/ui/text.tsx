import type { ComponentRef, ReactNode, Ref } from "react";
import {
  Text as RNText,
  TextInput as RNTextInput,
  StyleSheet,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
} from "react-native";

/**
 * Drop-in `Text` / `TextInput` that keep Urdu from being clipped.
 *
 * The system Urdu font (Nastaliq on iOS) is much taller than Latin text, so the app's fixed
 * `lineHeight`s cut off the top and bottom of letters. Any text containing Arabic-script
 * characters switches to Noto Naskh Arabic (compact, readable) with a tall-enough line height.
 * Latin-only text (English, Malay, amounts) renders exactly as before.
 */

const ARABIC_SCRIPT = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/;

/** Custom fonts ignore `fontWeight` on Android, so each weight maps to its own loaded family. */
export const URDU_FONT_FAMILIES = {
  regular: "NotoNaskhArabic_400Regular",
  medium: "NotoNaskhArabic_500Medium",
  semibold: "NotoNaskhArabic_600SemiBold",
  bold: "NotoNaskhArabic_700Bold",
} as const;

/** Naskh needs roughly 1.7× the font size to fit its marks above and below the line. */
const URDU_LINE_HEIGHT_RATIO = 1.7;

function hasArabicScript(node: ReactNode): boolean {
  if (typeof node === "string") return ARABIC_SCRIPT.test(node);
  if (Array.isArray(node)) return node.some(hasArabicScript);
  return false;
}

function familyForWeight(weight: TextStyle["fontWeight"]): string {
  const w = weight === "bold" ? 700 : weight === "normal" || weight == null ? 400 : Number(weight);
  if (w >= 700) return URDU_FONT_FAMILIES.bold;
  if (w >= 600) return URDU_FONT_FAMILIES.semibold;
  if (w >= 500) return URDU_FONT_FAMILIES.medium;
  return URDU_FONT_FAMILIES.regular;
}

function urduStyle(style: StyleProp<TextStyle>): TextStyle {
  const flat = StyleSheet.flatten(style) ?? {};
  const fontSize = flat.fontSize ?? 14;
  const minLineHeight = Math.ceil(fontSize * URDU_LINE_HEIGHT_RATIO);
  return {
    fontFamily: familyForWeight(flat.fontWeight),
    fontWeight: "normal",
    letterSpacing: 0,
    includeFontPadding: true,
    ...(flat.lineHeight != null ? { lineHeight: Math.max(flat.lineHeight, minLineHeight) } : null),
  };
}

export function Text({ style, children, ref, ...rest }: TextProps & { ref?: Ref<ComponentRef<typeof RNText>> }) {
  return (
    <RNText ref={ref} {...rest} style={hasArabicScript(children) ? [style, urduStyle(style)] : style}>
      {children}
    </RNText>
  );
}

export function TextInput({ style, ref, ...rest }: TextInputProps & { ref?: Ref<ComponentRef<typeof RNTextInput>> }) {
  const urdu = rest.value ? hasArabicScript(rest.value) : hasArabicScript(rest.placeholder ?? rest.defaultValue ?? "");
  return <RNTextInput ref={ref} {...rest} style={urdu ? [style, urduStyle(style)] : style} />;
}
