import { BigActionButton } from "@/components/ui/big-action-button";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { PersonAvatar } from "@/components/ui/person-avatar";
import { BakimateColors } from "@/constants/bakimate-theme";
import { Colors } from "@/constants/theme";
import { pickContactWithSystemPicker } from "@/lib/contact-suggestions";
import { setCustomerPhoto } from "@/lib/customer-photos";
import { useCreateCustomer } from "@/lib/hooks/useCustomers";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
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
 * Add Customer sheet: pictogram-led, big photo capture on top so non-readers
 * can identify the row by face later. Photo is saved locally keyed by the
 * new customer's id after the API round-trip succeeds.
 */
export function AddCustomerSheet({ visible, isDark, onClose }: Props) {
  const { t } = useTranslation();
  const headline = Colors[isDark ? "dark" : "light"].text;
  const muted = isDark ? BakimateColors.neutralTextMutedDark : BakimateColors.neutralText;
  const inputBorder = isDark ? BakimateColors.glassBorderDark : "rgba(15, 23, 42, 0.12)";

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [contactsBusy, setContactsBusy] = useState(false);
  /**
   * Android: presenting the system contact Activity on top of our RN `Modal` BottomSheet
   * causes native crashes on many devices. Briefly hide the sheet, then restore it.
   */
  const [androidHideSheetForContactPicker, setAndroidHideSheetForContactPicker] = useState(false);

  const createMut = useCreateCustomer();

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
    setPhotoUri(null);
    onClose();
  };

  const pickPhoto = async (source: "camera" | "library") => {
    if (Platform.OS === "web") {
      Alert.alert(t("error"), t("snap_receipt_web_unavailable"));
      return;
    }

    const perm =
      source === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t("error"), t("shop_duitnow_qr_permission_denied"));
      return;
    }

    const result =
      source === "camera"
        ? await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
          })
        : await ImagePicker.launchImageLibraryAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
          });

    if (result.canceled) return;
    const uri = result.assets?.[0]?.uri;
    if (uri) setPhotoUri(uri);
  };

  const promptPhotoSource = () => {
    if (Platform.OS === "web") return;
    Alert.alert(t("add_customer"), undefined, [
      { text: t("cancel"), style: "cancel" },
      { text: "Camera", onPress: () => void pickPhoto("camera") },
      { text: "Gallery", onPress: () => void pickPhoto("library") },
    ]);
  };

  const handleSave = () => {
    const n = name.trim();
    if (!n) {
      Alert.alert(t("error"), t("customer_name_required"));
      return;
    }

    createMut.mutate(
      { name: n, phone: phone.trim() || null },
      {
        onSuccess: async (result) => {
          const created = result.customer;
          if (photoUri) {
            try {
              await setCustomerPhoto(created.id, photoUri);
            } catch {
              /* photo save is best-effort */
            }
          }
          if (result.queued) {
            Alert.alert(t("saved_offline_title"), t("saved_offline_customer_body"));
          }
          handleClose();
        },
        onError: (e: unknown) =>
          Alert.alert(
            t("error"),
            e instanceof Error ? e.message : String(e),
          ),
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
      <View style={styles.photoWrap}>
        <Pressable
          onPress={promptPhotoSource}
          accessibilityRole="button"
          accessibilityLabel={t("add_customer")}
          style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
        >
          {photoUri ? (
            <PersonAvatar name={name} uriOverride={photoUri} size="xl" />
          ) : (
            <View style={[styles.photoSlot, { borderColor: BakimateColors.accentTeal }]}>
              <Ionicons name="camera-outline" size={40} color={BakimateColors.accentTeal} />
            </View>
          )}
        </Pressable>
      </View>

      <Text style={[styles.label, { color: muted }]}>{t("customer_name")}</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder={t("customer_name")}
        placeholderTextColor={muted}
        style={[
          styles.input,
          { color: headline, borderColor: inputBorder },
        ]}
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
        style={[
          styles.input,
          { color: headline, borderColor: inputBorder },
        ]}
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
  photoWrap: { alignItems: "center", marginTop: 6, marginBottom: 18 },
  photoSlot: {
    width: 128,
    height: 128,
    borderRadius: 64,
    borderWidth: 2.5,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(46, 196, 182, 0.1)",
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
