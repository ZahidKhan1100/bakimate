import { BigActionButton } from "@/components/ui/big-action-button";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { PersonAvatar } from "@/components/ui/person-avatar";
import { BakimateColors } from "@/constants/bakimate-theme";
import { Colors } from "@/constants/theme";
import { loadContactsDirectory, matchContactSuggestions } from "@/lib/contact-suggestions";
import { setCustomerPhoto } from "@/lib/customer-photos";
import { useCreateCustomer } from "@/lib/hooks/useCustomers";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Contacts from "expo-contacts";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Platform,
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
  const [contactsDir, setContactsDir] = useState<Contacts.Contact[]>([]);

  const createMut = useCreateCustomer();

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
        onSuccess: async (created) => {
          if (photoUri) {
            try {
              await setCustomerPhoto(created.id, photoUri);
            } catch {
              /* photo save is best-effort */
            }
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
    <BottomSheet visible={visible} onClose={handleClose} isDark={isDark} scrollable>
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
        autoFocus
        style={[
          styles.input,
          { color: headline, borderColor: inputBorder },
        ]}
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
