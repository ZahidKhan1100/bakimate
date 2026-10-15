import { BakimateColors } from "@/constants/bakimate-theme";
import * as Haptics from "expo-haptics";
import { useCallback, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "@/components/ui/text";

const INDEX_LETTERS = ["#", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")];
/** Compact line height — matches iOS Contacts index density. */
const LETTER_LINE = 11;
const RAIL_HEIGHT = INDEX_LETTERS.length * LETTER_LINE;

type Props = {
  sectionTitles: string[];
  /** Section letter currently at top of list (scroll sync). */
  activeLetter?: string | null;
  onJump: (letter: string) => void;
  isDark: boolean;
};

/**
 * iOS Contacts-style A–Z rail: compact, vertically centered; tap or drag to jump.
 */
export function PersonAlphabetIndex({ sectionTitles, activeLetter, onJump, isDark }: Props) {
  const available = new Set(sectionTitles);
  const accent = isDark ? BakimateColors.accentTeal : "#3B82F6";
  const idle = isDark ? "rgba(148,163,184,0.45)" : "rgba(100,116,139,0.45)";
  const lastJump = useRef<string | null>(null);

  const pickLetterAtY = useCallback(
    (localY: number) => {
      const idx = Math.min(
        INDEX_LETTERS.length - 1,
        Math.max(0, Math.floor(localY / LETTER_LINE)),
      );
      const letter = INDEX_LETTERS[idx];
      if (!available.has(letter) || letter === lastJump.current) {
        return;
      }
      lastJump.current = letter;
      void Haptics.selectionAsync().catch(() => {});
      onJump(letter);
    },
    [available, onJump],
  );

  return (
    <View style={styles.anchor} pointerEvents="box-none">
      <View
        style={styles.wrap}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={(e) => {
          lastJump.current = null;
          pickLetterAtY(e.nativeEvent.locationY);
        }}
        onResponderMove={(e) => {
          pickLetterAtY(e.nativeEvent.locationY);
        }}
        onResponderRelease={() => {
          lastJump.current = null;
        }}
        onResponderTerminate={() => {
          lastJump.current = null;
        }}
      >
        <View style={styles.lettersColumn} pointerEvents="none">
          {INDEX_LETTERS.map((letter) => {
            const enabled = available.has(letter);
            const isActive = enabled && activeLetter === letter;
            return (
              <View key={letter} style={styles.letterHit}>
                <Text
                  style={[
                    styles.letter,
                    {
                      color: isActive ? accent : enabled ? accent : idle,
                      fontWeight: isActive ? "800" : enabled ? "600" : "500",
                      fontSize: isActive ? 10.5 : 9.5,
                    },
                  ]}
                >
                  {letter}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  /** Centers the rail in the list area (not full screen height). */
  anchor: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 28,
    zIndex: 4,
    justifyContent: "center",
    alignItems: "center",
    pointerEvents: "box-none",
  },
  wrap: {
    height: RAIL_HEIGHT,
    width: 22,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 2,
  },
  lettersColumn: {
    height: RAIL_HEIGHT,
    justifyContent: "flex-start",
    alignItems: "center",
  },
  letterHit: {
    height: LETTER_LINE,
    width: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  letter: { textAlign: "center", width: 16, lineHeight: LETTER_LINE },
});
