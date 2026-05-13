import { BigActionButton } from "@/components/ui/big-action-button";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { BakimateColors } from "@/constants/bakimate-theme";
import { Colors } from "@/constants/theme";
import { loadContactsDirectory, matchContactSuggestions } from "@/lib/contact-suggestions";
import { useCreateSupplier } from "@/lib/hooks/useSuppliers";
import { Ionicons } from "@expo/vector-icons";
import * as Contacts from "expo-contacts";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type Props = {
  visible: boolean;
  isDark: boolean;
  onClose: () => void;
};

/**
 * Add Supplier sheet. No photo (suppliers fall back to a parcel pictogram
 * via the supplier avatar variant), just name + optional phone with big
 * check/X confirm.
 */
export function AddSupplierSheet({ visible, isDark, onClose }: Props) {
  const { t } = useTranslation();
  const headline = Colors[isDark ? "dark" : "light"].text;
  const muted = isDark ? BakimateColors.neutralTextMutedDark : BakimateColors.neutralText;
  const inputBorder = isDark ? BakimateColors.glassBorderDark : "rgba(15, 23, 42, 0.12)";

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [contactsDir, setContactsDir] = useState<Contacts.Contact[]>([]);

  const createMut = useCreateSupplier();

  useEffect(() => {
    if (!visible) {
      setContactsDir([]);
      return;
    }
    let cancelled = false;
    void loadContactsDirectory().then((list) => {
      if (!cancelled) {
        setContactsDir(list ?? []);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [visible]);

  const nameSuggestions = useMemo(() => matchContactSuggestions(contactsDir, name), [contactsDir, name]);

  const handleClose = () => {
    setName("");
    setPhone("");
    onClose();
  };

  const handleSave = () => {
    const n = name.trim();
    if (!n) {
      Alert.alert(t("error"), t("supplier_name_required"));
      return;
    }
    createMut.mutate(
      { name: n, phone: phone.trim() || null },
      {
        onSuccess: () => handleClose(),
        onError: (e: unknown) =>
          Alert.alert(t("error"), e instanceof Error ? e.message : String(e)),
      },
    );
  };

  return (
    <BottomSheet visible={visible} onClose={handleClose} isDark={isDark} scrollable>
      <View style={styles.iconWrap}>
        <View style={[styles.iconDisc, { backgroundColor: BakimateColors.accentTeal + "22" }]}>
          <Ionicons name="cube" size={48} color={BakimateColors.accentTeal} />
        </View>
      </View>

      <Text style={[styles.label, { color: muted }]}>{t("supplier_name")}</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder={t("supplier_name")}
        placeholderTextColor={muted}
        autoFocus
        style={[styles.input, { color: headline, borderColor: inputBorder }]}
      />

      {nameSuggestions.length > 0 ? (
        <View style={styles.suggestBlock}>
          <Text style={[styles.suggestTitle, { color: muted }]}>{t("contact_suggestions_title")}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.suggestRow}>
              {nameSuggestions.map((s) => (
                <Pressable
                  key={s.id}
                  onPress={() => {
                    setName(s.name);
                    setPhone(s.phone);
                  }}
                  style={({ pressed }) => [
                    styles.suggestChip,
                    {
                      borderColor: inputBorder,
                      backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(46,196,182,0.12)",
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.suggestName, { color: headline }]} numberOfLines={1}>
                    {s.name}
                  </Text>
                  <Text style={[styles.suggestPhone, { color: muted }]} numberOfLines={1}>
                    {s.phone}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>
      ) : null}

      <Text style={[styles.label, { color: muted }]}>{t("phone_optional")}</Text>
      <TextInput
        value={phone}
        onChangeText={setPhone}
        placeholder={t("phone_optional")}
        placeholderTextColor={muted}
        keyboardType="phone-pad"
        style={[styles.input, { color: headline, borderColor: inputBorder }]}
      />

      <View style={styles.footerActions}>
        <BigActionButton
          onPress={handleClose}
          icon="close"
          variant="danger"
          size="lg"
          accessibilityLabel={t("cancel")}
          style={styles.footerBtn}
        />
        <BigActionButton
          onPress={handleSave}
          icon="checkmark"
          variant="success"
          size="lg"
          accessibilityLabel={t("save")}
          disabled={createMut.isPending}
          style={styles.footerBtn}
        />
      </View>

      {createMut.isPending ? (
        <View style={styles.busyOverlay} pointerEvents="none">
          <ActivityIndicator color={BakimateColors.accentTeal} />
        </View>
      ) : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  iconWrap: { alignItems: "center", marginTop: 6, marginBottom: 18 },
  iconDisc: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { fontSize: 12, fontWeight: "800", marginBottom: 6, marginTop: 8 },
  suggestBlock: { marginTop: 4, marginBottom: 4 },
  suggestTitle: { fontSize: 11, fontWeight: "800", marginBottom: 8 },
  suggestRow: { flexDirection: "row", gap: 10, paddingRight: 8 },
  suggestChip: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 120,
    maxWidth: 200,
  },
  suggestName: { fontSize: 14, fontWeight: "800" },
  suggestPhone: { fontSize: 12, fontWeight: "600", marginTop: 2 },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    fontWeight: "600",
    fontSize: 18,
    marginBottom: 4,
  },
  footerActions: { flexDirection: "row", gap: 12, marginTop: 20 },
  footerBtn: { flex: 1 },
  busyOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15, 23, 42, 0.18)",
  },
});
