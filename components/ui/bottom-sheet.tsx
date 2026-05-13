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
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  visible: boolean;
  onClose: () => void;
  isDark: boolean;
  children: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  /** If true, content is wrapped in a ScrollView so tall sheets remain usable on small phones. */
  scrollable?: boolean;
};

/**
 * Reusable bottom sheet. Replaces the 3 inline modal implementations in
 * `customer/[id].tsx`, `customers.tsx`, and `suppliers.tsx`.
 */
export function BottomSheet({ visible, onClose, isDark, children, contentStyle, scrollable }: Props) {
  const insets = useSafeAreaInsets();
  const keyboardOffset = Platform.OS === "ios" ? Math.max(insets.bottom, 8) : 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.kavFill}
          keyboardVerticalOffset={keyboardOffset}
        >
          <SafeAreaView edges={["bottom"]} style={styles.safeBottom} pointerEvents="box-none">
            <View
              style={[
                styles.sheet,
                {
                  backgroundColor: isDark
                    ? "rgba(15, 23, 42, 0.98)"
                    : "rgba(255, 255, 255, 0.99)",
                  borderColor: isDark ? BakimateColors.glassBorderDark : BakimateColors.border,
                },
                contentStyle,
              ]}
            >
              <View style={styles.grabber} />
              {scrollable ? (
                <ScrollView
                  contentContainerStyle={styles.scrollPad}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  keyboardDismissMode="on-drag"
                >
                  {children}
                </ScrollView>
              ) : (
                <View style={styles.contentPad}>{children}</View>
              )}
            </View>
          </SafeAreaView>
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
  safeBottom: { width: "100%" },
  sheet: {
    width: "100%",
    maxHeight: "90%",
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
  contentPad: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 18 },
  scrollPad: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 18 },
});
