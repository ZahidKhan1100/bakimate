import { CurrencyPickerModal } from "@/components/currency-picker-modal";
import { BigActionButton } from "@/components/ui/big-action-button";
import { BakimateColors } from "@/constants/bakimate-theme";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Qk } from "@/lib/hooks/query-keys";
import { queryClient } from "@/lib/query-client";
import { fetchShopProfile, patchShopProfile } from "@/lib/shop-api";
import { deleteShopDuitNowQr, uploadShopDuitNowQr } from "@/lib/shop-duitnow-qr-api";
import { currencyNameOnly } from "@/lib/shop-currencies";
import {
  emptyShopProfile,
  localProfileToShopPatch,
  resolveShopProfile,
  shopApiToProfile,
} from "@/lib/shop-profile";
import { useSessionStore } from "@/stores/session-store";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import type { ComponentProps, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";

type IoniconName = ComponentProps<typeof Ionicons>["name"];

/** Reusable visual section header — pictogram disc + title + hint. */
function SectionHeader({
  icon,
  title,
  hint,
  isDark,
}: {
  icon: IoniconName;
  title: string;
  hint?: string;
  isDark: boolean;
}) {
  const headline = Colors[isDark ? "dark" : "light"].text;
  const muted = isDark ? BakimateColors.neutralTextMutedDark : BakimateColors.neutralText;
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionDisc}>
        <Ionicons name={icon} size={24} color={BakimateColors.accentTeal} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.sectionTitle, { color: headline }]}>{title}</Text>
        {hint ? <Text style={[styles.sectionHint, { color: muted }]}>{hint}</Text> : null}
      </View>
    </View>
  );
}

/** Reusable card wrapper. */
function SectionCard({ isDark, children }: { isDark: boolean; children: ReactNode }) {
  return (
    <View
      style={[
        styles.sectionCard,
        {
          backgroundColor: isDark ? "rgba(15, 23, 42, 0.55)" : "rgba(255, 255, 255, 0.94)",
          borderColor: isDark ? BakimateColors.glassBorderDark : BakimateColors.border,
        },
      ]}
    >
      {children}
    </View>
  );
}

/** Labelled input with optional inline icon. */
function FieldInput({
  icon,
  label,
  hint,
  isDark,
  ...inputProps
}: {
  icon?: IoniconName;
  label: string;
  hint?: string;
  isDark: boolean;
} & TextInputProps) {
  const headline = Colors[isDark ? "dark" : "light"].text;
  const muted = isDark ? BakimateColors.neutralTextMutedDark : BakimateColors.neutralText;
  const inputBorder = isDark ? BakimateColors.glassBorderDark : "rgba(15, 23, 42, 0.12)";
  const inputFill = isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(255, 255, 255, 0.78)";
  return (
    <View style={styles.fieldWrap}>
      <View style={styles.labelRow}>
        {icon ? <Ionicons name={icon} size={16} color={BakimateColors.accentTeal} /> : null}
        <Text style={[styles.label, { color: headline }]}>{label}</Text>
      </View>
      {hint ? <Text style={[styles.hint, { color: muted }]}>{hint}</Text> : null}
      <TextInput
        placeholderTextColor={muted}
        style={[
          styles.input,
          inputProps.multiline ? styles.inputMultiline : null,
          { borderColor: inputBorder, backgroundColor: inputFill, color: headline },
          inputProps.style,
        ]}
        {...inputProps}
      />
    </View>
  );
}

/** Shop ledger fields + DuitNow QR — used on `shop-settings` (and routed from Profile). */
export function ShopProfileEditor() {
  const { t, i18n } = useTranslation();
  const raw = useColorScheme();
  const theme = raw === "dark" ? "dark" : "light";
  const isDark = theme === "dark";
  const headline = Colors[isDark ? "dark" : "light"].text;
  const muted = isDark ? BakimateColors.neutralTextMutedDark : BakimateColors.neutralText;
  const inputBorder = isDark ? BakimateColors.glassBorderDark : "rgba(15, 23, 42, 0.12)";

  const token = useSessionStore((s) => s.token);
  const user = useSessionStore((s) => s.user);
  const shopProfiles = useSessionStore((s) => s.shopProfiles ?? {});

  const persistedLocal = useMemo(
    () => resolveShopProfile(shopProfiles, user?.id),
    [shopProfiles, user?.id],
  );

  const shopQuery = useQuery({
    queryKey: Qk.shopProfile,
    queryFn: fetchShopProfile,
    enabled: Boolean(token && user),
    staleTime: 30 * 1000,
  });

  const [draft, setDraft] = useState(emptyShopProfile);
  const [savedFlash, setSavedFlash] = useState(false);
  const [currencyModalOpen, setCurrencyModalOpen] = useState(false);

  useEffect(() => {
    if (shopQuery.data) {
      setDraft(shopApiToProfile(shopQuery.data));
      return;
    }
    setDraft(persistedLocal);
  }, [shopQuery.data, persistedLocal, user?.id]);

  const remoteBaseline = shopQuery.data ? shopApiToProfile(shopQuery.data) : persistedLocal;

  const dirty = useMemo(
    () =>
      draft.shopName.trim() !== remoteBaseline.shopName.trim() ||
      draft.shopLocation.trim() !== remoteBaseline.shopLocation.trim() ||
      draft.shopContact.trim() !== remoteBaseline.shopContact.trim() ||
      draft.paymentInstructions.trim() !== remoteBaseline.paymentInstructions.trim() ||
      draft.quickItemsLines.trim() !== remoteBaseline.quickItemsLines.trim() ||
      draft.primaryCurrencyCode.trim().toUpperCase() !==
        remoteBaseline.primaryCurrencyCode.trim().toUpperCase(),
    [draft, remoteBaseline],
  );

  const shopSave = useMutation({
    mutationFn: () => patchShopProfile(localProfileToShopPatch(draft)),
    onSuccess: (dto) => {
      queryClient.setQueryData(Qk.shopProfile, dto);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1600);
    },
  });

  const duitNowQrUpload = useMutation({
    mutationFn: async () => {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        throw new Error("permission_denied");
      }
      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.92,
      });
      if (picked.canceled || !picked.assets[0]?.uri) {
        throw new Error("cancel");
      }
      const a = picked.assets[0];
      return uploadShopDuitNowQr({ uri: a.uri, mimeType: a.mimeType });
    },
    onSuccess: (dto) => {
      queryClient.setQueryData(Qk.shopProfile, dto);
    },
    onError: (e: unknown) => {
      if (e instanceof Error && e.message === "permission_denied") {
        Alert.alert(t("error"), t("shop_duitnow_qr_permission_denied"));
        return;
      }
      if (e instanceof Error && e.message === "cancel") {
        return;
      }
      Alert.alert(t("error"), e instanceof Error ? e.message : String(e));
    },
  });

  const duitNowQrDelete = useMutation({
    mutationFn: () => deleteShopDuitNowQr(),
    onSuccess: (dto) => {
      queryClient.setQueryData(Qk.shopProfile, dto);
    },
    onError: (e: unknown) => {
      Alert.alert(t("error"), e instanceof Error ? e.message : String(e));
    },
  });

  const duitNowQrRemote = shopQuery.data?.duitnow_qr_url ?? null;
  const duitNowQrBusy = duitNowQrUpload.isPending || duitNowQrDelete.isPending;

  const saveDisabled = !dirty || shopSave.isPending;

  if (!token || !user) {
    return null;
  }

  return (
    <View style={styles.wrap}>
      {shopQuery.isError ? (
        <View
          style={[
            styles.errorCard,
            {
              backgroundColor: isDark
                ? "rgba(239, 68, 68, 0.12)"
                : "rgba(239, 68, 68, 0.08)",
              borderColor: BakimateColors.danger,
            },
          ]}
        >
          <Ionicons name="alert-circle" size={20} color={BakimateColors.danger} />
          <Text style={[styles.errorText, { color: BakimateColors.danger }]}>
            {(shopQuery.error as Error)?.message ?? t("shop_load_failed")}
          </Text>
        </View>
      ) : null}

      {shopQuery.isPending && !shopQuery.data ? (
        <ActivityIndicator style={{ marginVertical: 12 }} color={BakimateColors.accentTeal} />
      ) : null}

      {/* Section: Identity */}
      <SectionCard isDark={isDark}>
        <SectionHeader
          icon="storefront"
          title={t("shop_profile_section")}
          hint={t("shop_profile_hint")}
          isDark={isDark}
        />

        <FieldInput
          icon="pricetag"
          label={t("shop_name_label")}
          isDark={isDark}
          value={draft.shopName}
          onChangeText={(shopName) => setDraft((d) => ({ ...d, shopName }))}
          placeholder={t("shop_name_label")}
          autoCapitalize="words"
        />

        <View style={styles.fieldWrap}>
          <View style={styles.labelRow}>
            <Ionicons name="cash" size={16} color={BakimateColors.accentTeal} />
            <Text style={[styles.label, { color: headline }]}>{t("shop_primary_currency_label")}</Text>
          </View>
          <Text style={[styles.hint, { color: muted }]}>{t("shop_primary_currency_hint")}</Text>
          <Pressable
            onPress={() => setCurrencyModalOpen(true)}
            style={({ pressed }) => [
              styles.currencyTrigger,
              {
                borderColor: inputBorder,
                backgroundColor: isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(255, 255, 255, 0.78)",
                opacity: pressed ? 0.88 : 1,
              },
            ]}
          >
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.currencyTriggerCode, { color: headline }]}>
                {draft.primaryCurrencyCode.trim().toUpperCase() || "—"}
              </Text>
              <Text style={[styles.currencyTriggerSub, { color: muted }]} numberOfLines={1}>
                {/^[A-Za-z]{3}$/.test(draft.primaryCurrencyCode.trim())
                  ? currencyNameOnly(draft.primaryCurrencyCode, i18n.language)
                  : "—"}
              </Text>
            </View>
            <View style={[styles.currencyTriggerBtn, { borderColor: BakimateColors.accentTeal }]}>
              <Ionicons name="chevron-down" size={18} color={BakimateColors.accentTeal} />
              <Text style={styles.currencyTriggerBtnText}>{t("shop_currency_choose")}</Text>
            </View>
          </Pressable>
        </View>

        <FieldInput
          icon="location"
          label={t("shop_location_label")}
          isDark={isDark}
          value={draft.shopLocation}
          onChangeText={(shopLocation) => setDraft((d) => ({ ...d, shopLocation }))}
          placeholder={t("shop_location_label")}
          multiline
          textAlignVertical="top"
        />

        <FieldInput
          icon="call"
          label={t("shop_contact_label")}
          isDark={isDark}
          value={draft.shopContact}
          onChangeText={(shopContact) => setDraft((d) => ({ ...d, shopContact }))}
          placeholder={t("shop_contact_placeholder")}
          keyboardType="phone-pad"
          autoComplete="tel"
        />
      </SectionCard>

      {/* Section: Payment instructions */}
      <SectionCard isDark={isDark}>
        <SectionHeader
          icon="wallet"
          title={t("shop_payment_instructions_label")}
          hint={t("shop_payment_instructions_hint")}
          isDark={isDark}
        />
        <FieldInput
          label={t("shop_payment_instructions_label")}
          isDark={isDark}
          value={draft.paymentInstructions}
          onChangeText={(paymentInstructions) => setDraft((d) => ({ ...d, paymentInstructions }))}
          placeholder={t("shop_payment_instructions_placeholder")}
          multiline
          textAlignVertical="top"
        />
      </SectionCard>

      {/* Section: DuitNow QR */}
      <SectionCard isDark={isDark}>
        <SectionHeader
          icon="qr-code"
          title={t("shop_duitnow_qr_title")}
          hint={t("shop_duitnow_qr_hint")}
          isDark={isDark}
        />

        {Platform.OS === "web" ? (
          <Text style={[styles.webHint, { color: muted }]}>{t("shop_duitnow_qr_web_hint")}</Text>
        ) : (
          <>
            {duitNowQrRemote ? (
              <View style={styles.qrPreviewWrap}>
                <Image source={{ uri: duitNowQrRemote }} style={styles.qrPreview} contentFit="contain" />
              </View>
            ) : (
              <View
                style={[
                  styles.qrPlaceholder,
                  { borderColor: inputBorder, backgroundColor: isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(255, 255, 255, 0.5)" },
                ]}
              >
                <Ionicons name="qr-code-outline" size={56} color={muted} />
                <Text style={[styles.qrPlaceholderHint, { color: muted }]}>
                  {t("shop_duitnow_qr_choose")}
                </Text>
              </View>
            )}
            <View style={styles.qrActions}>
              <BigActionButton
                onPress={() => void duitNowQrUpload.mutate()}
                icon="cloud-upload"
                variant="primary"
                size="md"
                label={t("shop_duitnow_qr_choose")}
                accessibilityLabel={t("shop_duitnow_qr_choose")}
                disabled={duitNowQrBusy}
                style={{ flex: 1 }}
              />
              {duitNowQrRemote ? (
                <BigActionButton
                  onPress={() => {
                    Alert.alert(t("shop_duitnow_qr_remove"), "", [
                      { text: t("cancel"), style: "cancel" },
                      {
                        text: t("shop_duitnow_qr_remove"),
                        style: "destructive",
                        onPress: () => void duitNowQrDelete.mutate(),
                      },
                    ]);
                  }}
                  icon="trash"
                  variant="danger"
                  size="md"
                  accessibilityLabel={t("shop_duitnow_qr_remove")}
                  disabled={duitNowQrBusy}
                />
              ) : null}
            </View>
            {duitNowQrBusy ? (
              <ActivityIndicator style={{ marginTop: 10 }} color={BakimateColors.accentTeal} />
            ) : null}
          </>
        )}
      </SectionCard>

      {/* Section: Quick items */}
      <SectionCard isDark={isDark}>
        <SectionHeader
          icon="cube"
          title={t("shop_quick_items_label")}
          hint={t("shop_quick_items_hint")}
          isDark={isDark}
        />
        <FieldInput
          label={t("shop_quick_items_label")}
          isDark={isDark}
          value={draft.quickItemsLines}
          onChangeText={(quickItemsLines) => setDraft((d) => ({ ...d, quickItemsLines }))}
          placeholder={t("shop_quick_items_placeholder")}
          multiline
          textAlignVertical="top"
        />
      </SectionCard>

      {/* Save — always `primary` so the control stays visible on dark mesh (neutral is near-invisible on dark). */}
      <View style={styles.saveWrap}>
        <BigActionButton
          onPress={() => shopSave.mutate()}
          icon={savedFlash ? "checkmark-circle" : "checkmark"}
          variant={savedFlash ? "success" : "primary"}
          size="lg"
          label={savedFlash ? t("shop_saved_toast") : t("save_shop_profile")}
          accessibilityLabel={t("save_shop_profile")}
          disabled={saveDisabled}
        />
        {shopSave.isPending ? (
          <View style={styles.busyOverlay} pointerEvents="none">
            <ActivityIndicator color="#fff" />
          </View>
        ) : null}
      </View>

      <CurrencyPickerModal
        visible={currencyModalOpen}
        onClose={() => setCurrencyModalOpen(false)}
        selectedCode={draft.primaryCurrencyCode}
        onSelect={(code) =>
          setDraft((d) => ({
            ...d,
            primaryCurrencyCode: code.toUpperCase().slice(0, 3),
          }))
        }
        isDark={isDark}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14, paddingTop: 4 },

  sectionCard: {
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 18,
    gap: 8,
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 6 },
  sectionDisc: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(46, 196, 182, 0.14)",
  },
  sectionTitle: { fontSize: 17, fontWeight: "900" },
  sectionHint: { marginTop: 4, fontSize: 12, fontWeight: "600", lineHeight: 17 },

  fieldWrap: { marginTop: 8 },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  label: { fontSize: 13, fontWeight: "800" },
  hint: { fontSize: 11, fontWeight: "600", lineHeight: 16, marginBottom: 6, marginTop: 2 },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: "600",
    minHeight: 48,
  },
  inputMultiline: { minHeight: 88, paddingTop: 12, textAlignVertical: "top" },

  currencyTrigger: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    minHeight: 52,
  },
  currencyTriggerCode: { fontSize: 20, fontWeight: "900", letterSpacing: 1 },
  currencyTriggerSub: { marginTop: 2, fontSize: 12, fontWeight: "600" },
  currencyTriggerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  currencyTriggerBtnText: { fontWeight: "900", fontSize: 12, color: BakimateColors.accentTeal },

  webHint: { fontSize: 13, fontWeight: "700", lineHeight: 19, marginTop: 8 },

  qrPreviewWrap: {
    marginTop: 10,
    alignSelf: "center",
    padding: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(46, 196, 182, 0.28)",
    backgroundColor: "rgba(255, 255, 255, 0.96)",
  },
  qrPreview: { width: 180, height: 180 },
  qrPlaceholder: {
    marginTop: 10,
    minHeight: 180,
    borderRadius: 18,
    borderWidth: 1,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    gap: 10,
  },
  qrPlaceholderHint: { fontSize: 14, fontWeight: "800", textAlign: "center" },
  qrActions: { flexDirection: "row", gap: 10, marginTop: 14 },

  errorCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  errorText: { flex: 1, fontWeight: "800", fontSize: 13, lineHeight: 18 },

  saveWrap: { marginTop: 4 },
  busyOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15, 23, 42, 0.25)",
    borderRadius: 22,
  },
});
