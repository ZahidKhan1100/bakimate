import { BigActionButton } from "@/components/ui/big-action-button";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { BakimateColors } from "@/constants/bakimate-theme";
import { Colors } from "@/constants/theme";
import { pickContactWithSystemPicker } from "@/lib/contact-suggestions";
import { useCreateSupplier } from "@/lib/hooks/useSuppliers";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  InteractionManager,
  Keyboard,
  Platform,
  Pressable,
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
  const [contactsBusy, setContactsBusy] = useState(false);
  /** Android: avoid native crash when launching contact picker above RN Modal. */
  const [androidHideSheetForContactPicker, setAndroidHideSheetForContactPicker] = useState(false);

  const createMut = useCreateSupplier();

  useEffect(() => {
    if (!visible) {
      setContactsBusy(false);
      setAndroidHideSheetForContactPicker(false);
    }
  }, [visible]);

  const pickFromContacts = () => {
    if (Platform.OS === "web") {
      Alert.alert(t("error"), t("snap_receipt_web_unavailable"));
      return;
    }
    if (contactsBusy) return;
    setContactsBusy(true);
    Keyboard.dismiss();
    const preDelayMs = Platform.OS === "android" ? 120 : 320;
    const androidModalGapMs = 420;

    setTimeout(() => {
      void (async () => {
        try {
          if (Platform.OS === "android") {
            setAndroidHideSheetForContactPicker(true);
            await new Promise<void>((resolve) => {
              InteractionManager.runAfterInteractions(() => setTimeout(resolve, androidModalGapMs));
            });
            try {
              const { suggestion: s, permissionDenied } = await pickContactWithSystemPicker();
              if (permissionDenied) {
                Alert.alert(t("error"), t("contact_suggestions_permission_denied"));
              }
              if (s) {
                setName(s.name);
                if (s.phone) setPhone(s.phone);
              }
            } finally {
              setAndroidHideSheetForContactPicker(false);
            }
          } else {
            const { suggestion: s, permissionDenied } = await pickContactWithSystemPicker();
            if (permissionDenied) {
              Alert.alert(t("error"), t("contact_suggestions_permission_denied"));
            }
            if (s) {
              setName(s.name);
              if (s.phone) setPhone(s.phone);
            }
          }
        } finally {
          setContactsBusy(false);
        }
      })();
    }, preDelayMs);
  };

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
    <BottomSheet
      visible={visible && !androidHideSheetForContactPicker}
      onClose={handleClose}
      isDark={isDark}
      scrollable
    >
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
        style={[styles.input, { color: headline, borderColor: inputBorder }]}
      />

      {Platform.OS !== "web" ? (
        <Pressable
          onPress={pickFromContacts}
          disabled={contactsBusy}
          accessibilityRole="button"
          accessibilityLabel={t("contact_suggestions_match")}
          style={({ pressed }) => [
            styles.contactMatchRow,
            {
              borderColor: inputBorder,
              opacity: contactsBusy ? 0.7 : pressed ? 0.88 : 1,
            },
          ]}
        >
          {contactsBusy ? (
            <ActivityIndicator color={BakimateColors.accentTeal} />
          ) : (
            <>
              <Ionicons name="people-outline" size={20} color={BakimateColors.accentTeal} />
              <Text style={[styles.contactMatchText, { color: headline }]}>{t("contact_suggestions_match")}</Text>
            </>
          )}
        </Pressable>
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
  contactMatchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 6,
    marginBottom: 2,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: "rgba(46, 196, 182, 0.08)",
  },
  contactMatchText: { fontSize: 14, fontWeight: "800" },
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
