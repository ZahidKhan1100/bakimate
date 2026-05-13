import { BakimateColors } from "@/constants/bakimate-theme";
import { Colors } from "@/constants/theme";
import { currencyNameOnly, SHOP_LEDGER_CURRENCY_CODES } from "@/lib/shop-currencies";
import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Props = {
  visible: boolean;
  onClose: () => void;
  selectedCode: string;
  onSelect: (code: string) => void;
  isDark: boolean;
};

export function CurrencyPickerModal({ visible, onClose, selectedCode, onSelect, isDark }: Props) {
  const { t, i18n } = useTranslation();
  const headline = Colors[isDark ? "dark" : "light"].text;
  const muted = isDark ? BakimateColors.neutralTextMutedDark : BakimateColors.neutralText;
  const border = isDark ? BakimateColors.glassBorderDark : "rgba(15, 23, 42, 0.12)";
  const fill = isDark ? "rgba(15, 23, 42, 0.98)" : "rgba(255, 255, 255, 0.99)";

  const [otherDraft, setOtherDraft] = useState("");

  const rows = useMemo(() => SHOP_LEDGER_CURRENCY_CODES.map((code) => ({ code })), []);

  const applyOther = () => {
    const raw = otherDraft.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(raw)) {
      return;
    }
    onSelect(raw);
    setOtherDraft("");
    onClose();
  };

  const pick = (code: string) => {
    onSelect(code);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === "ios" ? "pageSheet" : undefined}
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.safe, { backgroundColor: fill }]} edges={["top", "left", "right", "bottom"]}>
        <View style={[styles.header, { borderBottomColor: border }]}>
          <Pressable
            onPress={onClose}
            hitSlop={14}
            accessibilityRole="button"
            accessibilityLabel={t("cancel")}
            style={({ pressed }) => [styles.headerBtn, { opacity: pressed ? 0.65 : 1 }]}
          >
            <Ionicons name="close" size={28} color={headline} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: headline }]}>{t("shop_currency_modal_title")}</Text>
          <View style={{ width: 44 }} />
        </View>

        <FlatList
          data={rows}
          keyExtractor={(item) => item.code}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listPad}
          renderItem={({ item }) => {
            const sel = item.code === selectedCode.trim().toUpperCase();
            return (
              <Pressable
                onPress={() => pick(item.code)}
                style={({ pressed }) => [
                  styles.row,
                  {
                    borderColor: sel ? BakimateColors.accentTeal : border,
                    backgroundColor: sel
                      ? "rgba(46, 196, 182, 0.14)"
                      : pressed
                        ? isDark
                          ? "rgba(255,255,255,0.04)"
                          : "rgba(15,23,42,0.04)"
                        : "transparent",
                  },
                ]}
              >
                <Text style={[styles.rowCode, { color: headline }]}>{item.code}</Text>
                <Text style={[styles.rowName, { color: muted }]} numberOfLines={2}>
                  {currencyNameOnly(item.code, i18n.language)}
                </Text>
                {sel ? <Ionicons name="checkmark-circle" size={22} color={BakimateColors.accentTeal} /> : null}
              </Pressable>
            );
          }}
        />

        <View style={[styles.footer, { borderTopColor: border, backgroundColor: fill }]}>
          <Text style={[styles.footerLabel, { color: headline }]}>{t("shop_currency_other_hint")}</Text>
          <View style={styles.otherRow}>
            <TextInput
              value={otherDraft}
              onChangeText={(s) => setOtherDraft(s.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3))}
              placeholder="XXX"
              placeholderTextColor={muted}
              autoCapitalize="characters"
              maxLength={3}
              style={[
                styles.otherInput,
                { borderColor: border, color: headline, backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#fff" },
              ]}
            />
            <Pressable
              onPress={applyOther}
              disabled={otherDraft.length !== 3}
              style={({ pressed }) => [
                styles.applyBtn,
                {
                  backgroundColor: BakimateColors.accentTeal,
                  opacity: otherDraft.length !== 3 ? 0.45 : pressed ? 0.88 : 1,
                },
              ]}
            >
              <Ionicons name="checkmark" size={22} color="#fff" />
              <Text style={styles.applyBtnText}>{t("shop_currency_apply")}</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 17, fontWeight: "900" },
  listPad: { paddingHorizontal: 16, paddingBottom: 12 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  rowCode: { fontSize: 17, fontWeight: "900", width: 52 },
  rowName: { flex: 1, fontSize: 13, fontWeight: "600" },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 8 : 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerLabel: { fontSize: 13, fontWeight: "800", marginBottom: 8 },
  otherRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  otherInput: {
    flex: 1,
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 2,
  },
  applyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    minHeight: 52,
    borderRadius: 14,
    justifyContent: "center",
  },
  applyBtnText: { color: "#fff", fontWeight: "900", fontSize: 15 },
});
