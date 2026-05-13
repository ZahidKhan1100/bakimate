import { BakimateColors } from "@/constants/bakimate-theme";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useEffect } from "react";
import { Modal, StyleSheet, View } from "react-native";

type Props = {
  visible: boolean;
  onDone: () => void;
  /** Auto-dismiss timeout in ms (default 900). */
  durationMs?: number;
  /** `success` shows a green check, `danger` shows a red X. */
  tone?: "success" | "danger";
};

/**
 * Full-screen green check (or red X) confirmation. Lets us replace
 * `Alert.alert("Saved")` wall-of-text confirmations with a 1-second
 * universally-understood stamp.
 */
export function SuccessStamp({ visible, onDone, durationMs = 900, tone = "success" }: Props) {
  useEffect(() => {
    if (!visible) return;
    void Haptics.notificationAsync(
      tone === "success" ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning,
    ).catch(() => {});
    const t = setTimeout(onDone, durationMs);
    return () => clearTimeout(t);
  }, [visible, durationMs, onDone, tone]);

  const color = tone === "success" ? BakimateColors.success : BakimateColors.danger;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDone}>
      <View style={styles.root}>
        <View style={[styles.disc, { backgroundColor: color }]}>
          <Ionicons name={tone === "success" ? "checkmark" : "close"} size={96} color="#fff" />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "rgba(6, 12, 24, 0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  disc: {
    width: 160,
    height: 160,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
});
