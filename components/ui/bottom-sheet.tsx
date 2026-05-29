import { BakimateColors } from "@/constants/bakimate-theme";
import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  visible: boolean;
  onClose: () => void;
  isDark: boolean;
  children: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  /** If true, content is wrapped in a ScrollView so tall sheets remain usable on small phones. */
  scrollable?: boolean;
  /**
   * Shorter sheets for small pickers (theme, language) — ~45% of window.
   * Tall forms default to ~88% (credit/payment, add customer, etc.).
   */
  compact?: boolean;
};

/**
 * Reusable bottom sheet. Replaces the 3 inline modal implementations in
 * `customer/[id].tsx`, `customers.tsx`, and `suppliers.tsx`.
 */
export function BottomSheet({
  visible,
  onClose,
  isDark,
  children,
  contentStyle,
  scrollable,
  compact,
}: Props) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  /**
   * Fixed sheet height avoids ScrollView collapsing (flex: 1 parents need bounded height).
   * Default forms (add customer, record credit/payment, etc.) use ~88% of the window — was
   * ~64% min only, which felt cramped on phones. `compact` keeps short pickers (theme/language).
   */
  const ceiling = Math.round(windowHeight * 0.94);
  const sheetPixelHeight = compact
    ? Math.round(windowHeight * 0.45)
    : Math.min(Math.round(windowHeight * 0.88), ceiling);

  /** Modal + KAV: avoid double-counting bottom inset when keyboard opens (iOS gray/black strip). */
  const keyboardVerticalOffset = 0;
  const sheetBg = isDark ? "rgba(15, 23, 42, 0.98)" : "rgba(255, 255, 255, 0.99)";
  const bottomPad = 18 + insets.bottom;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      presentationStyle={Platform.OS === "ios" ? "overFullScreen" : undefined}
    >
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.kavFill}
          keyboardVerticalOffset={keyboardVerticalOffset}
        >
          {/* Same bg as sheet so keyboard / home-indicator strip never shows default window black */}
          <View style={[styles.sheetStack, { backgroundColor: sheetBg, height: sheetPixelHeight }]}>
            <View
              style={[
                styles.sheet,
                {
                  backgroundColor: sheetBg,
                  borderColor: isDark ? BakimateColors.glassBorderDark : BakimateColors.border,
                  paddingBottom: bottomPad,
                  height: sheetPixelHeight,
                  maxHeight: ceiling,
                },
                contentStyle,
              ]}
            >
              <View style={styles.grabber} />
              {scrollable ? (
                <ScrollView
                  style={styles.scrollFlex}
                  contentContainerStyle={[styles.scrollPadInner, compact ? styles.scrollPadCompact : null]}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={compact ? false : true}
                  keyboardDismissMode="on-drag"
                >
                  {children}
                </ScrollView>
              ) : (
                <View style={styles.contentPadInner}>{children}</View>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "rgba(6, 12, 24, 0.55)",
  },
  /** Fill width + height so keyboard padding lifts the sheet from the bottom without a gap above the keyboard. */
  kavFill: {
    flex: 1,
    width: "100%",
    justifyContent: "flex-end",
  },
  sheetStack: {
    width: "100%",
    alignSelf: "stretch",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
  },
  sheet: {
    width: "100%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
  },
  grabber: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: "rgba(15, 23, 42, 0.18)",
    marginTop: 10,
    marginBottom: 4,
  },
  /** Bottom safe inset is on the outer sheet via `paddingBottom` so the colored area matches the card. */
  contentPadInner: { paddingHorizontal: 20, paddingTop: 8, flex: 1 },
  scrollFlex: { flex: 1, minHeight: 0 },
  scrollPadInner: {
    paddingHorizontal: 20,
    paddingTop: 12,
    flexGrow: 1,
    paddingBottom: 28,
  },
  scrollPadCompact: {
    paddingBottom: 20,
    flexGrow: 0,
  },
});
