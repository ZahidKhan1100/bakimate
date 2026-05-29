import { GoalProgressRing } from "@/components/goal-progress-ring";
import { RecordTransactionSheet } from "@/components/record-transaction-sheet";
import { BigActionButton } from "@/components/ui/big-action-button";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { GlassSurface } from "@/components/ui/glass-surface";
import { MeshBackdrop } from "@/components/ui/mesh-backdrop";
import { MoneyDisplay } from "@/components/ui/money-display";
import { PersonAvatar } from "@/components/ui/person-avatar";
import { BakimateColors } from "@/constants/bakimate-theme";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { setCustomerPhoto, useCustomerPhoto, clearCustomerPhoto } from "@/lib/customer-photos";
import { rotateCustomerBalancePublicLink } from "@/lib/customers-api";
import { isPremiumRecordingBlockedError } from "@/lib/errors/premium-recording-blocked-error";
import { formatCalendarDateShort } from "@/lib/format-dates";
import { useCustomer } from "@/lib/hooks/useCustomer";
import { useDeleteCustomer, usePatchCustomer } from "@/lib/hooks/useCustomers";
import { useDeleteCustomerLedgerTransaction } from "@/lib/hooks/useLedgerTransactionMutations";
import { useOutboxPendingForCustomer } from "@/lib/hooks/useOutboxPendingForCustomer";
import { usePremiumEntitlementBootstrapBlocksUi } from "@/lib/hooks/usePremiumEntitlementBootstrapBlocksUi";
import { usePremiumRecordingAccess } from "@/lib/hooks/usePremiumRecordingAccess";
import { useShopCurrency } from "@/lib/hooks/useShopCurrency";
import { Qk } from "@/lib/hooks/query-keys";
import { formatMoneyMinor, goalProgressPaidRatio, parseRmToSen, suggestedWeeklyPaySen } from "@/lib/money";
import { apiErrorMessage } from "@/lib/api";
import { buildInstallmentReminderMessage } from "@/lib/payment-receipt";
import { shareCreditInvoicePdf, shareCustomerPdf, sharePaymentReceiptPdf } from "@/lib/pdf-download";
import { assertRecordingPremiumOrThrow } from "@/lib/premium-recording-access";
import { createCustomerPromise, updateCustomerPromise } from "@/lib/promise-api";
import { cancelPromiseReminder, schedulePromiseDueReminder } from "@/lib/promise-reminders";
import { fetchShopProfile } from "@/lib/shop-api";
import { profileToReceiptBlurb, resolveShopProfile } from "@/lib/shop-profile";
import { openWhatsAppText } from "@/lib/whatsapp";
import { normalizePhoneForWaMe } from "@/lib/phone-wa-me";
import { queryClient } from "@/lib/query-client";
import { useSessionStore } from "@/stores/session-store";
import type { CustomerLedgerTransactionApi, CustomerPromise } from "@/lib/api-types";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useIsRestoring } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { isAxiosError } from "axios";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function addDaysLocal(days: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}

const STAR_GOLD = "#FBBF24";

function StarsRow({ count, muted }: { count: number; muted: string }) {
  const shown = Math.min(Math.max(0, Math.floor(count)), 5);
  return (
    <View style={styles.starRow} accessibilityRole="text">
      {Array.from({ length: 5 }, (_, i) => (
        <Ionicons
          key={`star-${i}`}
          name={i < shown ? "star" : "star-outline"}
          size={18}
          color={i < shown ? STAR_GOLD : muted + "66"}
          style={{ marginRight: 3 }}
        />
      ))}
    </View>
  );
}

const DEFAULT_CREDIT_QUICK_ITEMS = ["Phone", "Fridge", "Grocery", "Accessory", "Other"] as const;

export default function CustomerDetailScreen() {
  const { t, i18n } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const customerId = Number(id);
  const token = useSessionStore((s) => s.token);
  const rawScheme = useColorScheme();
  const theme = rawScheme === "dark" ? "dark" : "light";
  const isDark = theme === "dark";
  const headline = Colors[theme].text;
  const muted = isDark ? BakimateColors.neutralTextMutedDark : BakimateColors.neutralText;

  const isQueryRestoring = useIsRestoring();

  const {
    data: customer,
    isLoading,
    error,
    refetch,
    isPartialListFallback,
  } = useCustomer(customerId, {
    enabled: Boolean(token) && Number.isFinite(customerId) && customerId > 0,
  });

  const shopProfileQ = useQuery({
    queryKey: Qk.shopProfile,
    queryFn: fetchShopProfile,
    enabled: Boolean(token) && !isQueryRestoring,
    staleTime: 30 * 1000,
  });

  const currency = useShopCurrency();
  const photoUri = useCustomerPhoto(customerId);
  const premiumRecording = usePremiumRecordingAccess(Boolean(token));
  const premiumBootstrapBlocks = usePremiumEntitlementBootstrapBlocksUi(premiumRecording.isLoading);
  const pendingOutbox = useOutboxPendingForCustomer(customerId, Boolean(token));

  const [sheetType, setSheetType] = useState<"credit" | "payment" | null>(null);
  const [editingTx, setEditingTx] = useState<CustomerLedgerTransactionApi | null>(null);
  const [duitnowQrOpen, setDuitnowQrOpen] = useState(false);
  const [promiseOpen, setPromiseOpen] = useState(false);
  const [promiseAmtRm, setPromiseAmtRm] = useState("");
  const [promiseDateYmd, setPromiseDateYmd] = useState(() => addDaysLocal(7));
  const [promiseNoteText, setPromiseNoteText] = useState("");
  const [pdfBusy, setPdfBusy] = useState<"ledger" | "settlement" | null>(null);
  const [invoiceBusyId, setInvoiceBusyId] = useState<number | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [editCustomerOpen, setEditCustomerOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");

  const patchCustomerMu = usePatchCustomer();
  const deleteCustomerMu = useDeleteCustomer();
  const deleteLedgerTxMu = useDeleteCustomerLedgerTransaction(customerId);

  const quickItems = useMemo(() => {
    const rows = shopProfileQ.data?.credit_quick_items ?? [];
    return rows.length > 0 ? rows : [...DEFAULT_CREDIT_QUICK_ITEMS];
  }, [shopProfileQ.data?.credit_quick_items]);

  const duitnowQrUrl = useMemo(
    () => shopProfileQ.data?.duitnow_qr_url?.trim() ?? "",
    [shopProfileQ.data?.duitnow_qr_url],
  );

  const balanceLinkMu = useMutation({
    mutationFn: async () => {
      await assertRecordingPremiumOrThrow();
      return rotateCustomerBalancePublicLink(customerId);
    },
    onSuccess: async (data) => {
      const msg = `${t("customer_balance_link_share_message", { name: customer?.name ?? "Customer" })}\n${data.url}`;
      try {
        await Share.share(Platform.OS === "ios" ? { message: msg, url: data.url } : { message: msg });
      } catch {
        /* user dismissed */
      }
      Alert.alert(t("customer_balance_link"), t("customer_balance_link_created"));
    },
    onError: (e: unknown) => {
      if (isPremiumRecordingBlockedError(e)) {
        router.push("/paywall");
        return;
      }
      Alert.alert(t("error"), e instanceof Error ? e.message : String(e));
    },
  });

  const createPromiseMu = useMutation({
    mutationFn: async () => {
      const sen = parseRmToSen(promiseAmtRm.trim());
      if (!sen) throw new Error(t("amount_invalid"));
      return createCustomerPromise(customerId, {
        amount_sen: sen,
        promised_date: promiseDateYmd.trim(),
        note: promiseNoteText.trim() || undefined,
      });
    },
    onSuccess: async (row) => {
      await queryClient.invalidateQueries({ queryKey: Qk.customer(customerId) });
      setPromiseOpen(false);
      setPromiseAmtRm("");
      setPromiseNoteText("");
      setPromiseDateYmd(addDaysLocal(7));
      await schedulePromiseDueReminder({
        promiseId: row.id,
        customerName: customer?.name ?? "Customer",
        amountSen: row.amount_sen,
        promisedDateYmd: row.promised_date,
        currencyCode: currency,
      });
    },
    onError: (e: unknown) => Alert.alert(t("error"), e instanceof Error ? e.message : String(e)),
  });

  const patchPromiseMu = useMutation({
    mutationFn: async (vars: { id: number; status: CustomerPromise["status"] }) =>
      updateCustomerPromise(customerId, vars.id, { status: vars.status }),
    onSuccess: async (_, vars) => {
      await cancelPromiseReminder(vars.id);
      await queryClient.invalidateQueries({ queryKey: Qk.customer(customerId) });
    },
    onError: (e: unknown) => Alert.alert(t("error"), e instanceof Error ? e.message : String(e)),
  });

  const requirePremium = () => {
    const status = premiumRecording.data;
    if (premiumBootstrapBlocks) return false;
    if (status?.requiresPremium === true && !status.entitled) {
      router.push("/paywall");
      return false;
    }
    return true;
  };

  const openSheet = (kind: "credit" | "payment") => {
    if (!requirePremium()) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setEditingTx(null);
    setSheetType(kind);
  };

  const openEditLedgerTx = (tx: CustomerLedgerTransactionApi) => {
    if (!requirePremium()) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setEditingTx(tx);
    setSheetType(tx.type === "credit" ? "credit" : "payment");
  };

  const confirmDeleteLedgerTx = (tx: CustomerLedgerTransactionApi) => {
    Alert.alert(t("customer_tx_delete_title"), t("customer_tx_delete_body"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("customer_tx_delete_confirm"),
        style: "destructive",
        onPress: () => {
          deleteLedgerTxMu.mutate(tx.id, {
            onSuccess: () => void refetch(),
            onError: (e: unknown) => {
              if (isPremiumRecordingBlockedError(e)) {
                router.push("/paywall");
                return;
              }
              Alert.alert(t("error"), e instanceof Error ? e.message : String(e));
            },
          });
        },
      },
    ]);
  };


  const openDuitnowQr = () => {
    if (duitnowQrUrl) {
      setDuitnowQrOpen(true);
      return;
    }
    Alert.alert(t("duitnow_qr_missing_title"), t("duitnow_qr_missing_body"), [
      { text: t("cancel"), style: "cancel" },
      { text: t("screen_shop_settings_title"), onPress: () => router.push("/shop-settings") },
    ]);
  };

  const onRemind = async () => {
    if (!customer) return;
    if (normalizePhoneForWaMe(customer.phone) === null) {
      Alert.alert(t("error"), t("contact_phone_required_whatsapp"));
      return;
    }
    const session = useSessionStore.getState();
    const shopBlur = profileToReceiptBlurb(resolveShopProfile(session.shopProfiles ?? {}, session.user?.id));
    const msg = buildInstallmentReminderMessage(customer.name, customer.balance_sen, shopBlur);
    try {
      await openWhatsAppText(msg, customer.phone);
    } catch {
      Alert.alert(t("share_failed_title"), t("whatsapp_unavailable"));
    }
  };

  const onShareBalanceLink = () => {
    if (!requirePremium()) return;
    balanceLinkMu.mutate();
  };

  const pickPhoto = async (source: "camera" | "library") => {
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
    if (!uri) return;
    setPhotoBusy(true);
    try {
      await setCustomerPhoto(customerId, uri);
    } finally {
      setPhotoBusy(false);
    }
  };

  const onChangePhoto = () => {
    if (Platform.OS === "web") return;
    Alert.alert(customer?.name ?? "", undefined, [
      { text: t("cancel"), style: "cancel" },
      { text: "Camera", onPress: () => void pickPhoto("camera") },
      { text: "Gallery", onPress: () => void pickPhoto("library") },
    ]);
  };

  const openPromiseResolution = (p: CustomerPromise) => {
    if (p.status !== "pending") return;
    Alert.alert(
      `${t("promise_resolve_title")} (${formatMoneyMinor(p.amount_sen, currency, i18n.language)})`,
      formatCalendarDateShort(p.promised_date, i18n.language),
      [
        { text: t("cancel"), style: "cancel" },
        { text: t("promise_action_kept"), onPress: () => void patchPromiseMu.mutate({ id: p.id, status: "kept" }) },
        { text: t("promise_action_missed"), style: "destructive", onPress: () => void patchPromiseMu.mutate({ id: p.id, status: "missed" }) },
        { text: t("promise_action_cancel_promise"), onPress: () => void patchPromiseMu.mutate({ id: p.id, status: "cancelled" }) },
      ],
    );
  };

  const gateOpenPromiseModal = () => {
    if (!requirePremium()) return;
    setPromiseDateYmd(addDaysLocal(7));
    setPromiseAmtRm("");
    setPromiseNoteText("");
    setPromiseOpen(true);
  };

  const shareLedgerOrSettlement = async (kind: "ledger" | "settlement") => {
    if (Platform.OS === "web") {
      Alert.alert(t("error"), t("customer_pdf_web_unavailable"));
      return;
    }
    if (!customer) return;
    if (!requirePremium()) return;
    if (kind === "settlement" && customer.balance_sen !== 0) {
      Alert.alert(t("error"), t("customer_settlement_not_ready"));
      return;
    }
    setPdfBusy(kind);
    try {
      await shareCustomerPdf(customer.id, kind, { whatsappPhone: customer.phone });
    } catch (e: unknown) {
      const code =
        typeof e === "object" && e !== null && "statusCode" in e && typeof (e as { statusCode?: unknown }).statusCode === "number"
          ? (e as { statusCode: number }).statusCode
          : undefined;
      if (code === 422 && kind === "settlement") {
        Alert.alert(t("error"), t("customer_settlement_not_ready"));
      } else {
        Alert.alert(t("error"), e instanceof Error ? e.message : String(e));
      }
    } finally {
      setPdfBusy(null);
    }
  };

  const openSingleEntryPdf = async (tx: CustomerLedgerTransactionApi) => {
    if (Platform.OS === "web") {
      Alert.alert(t("error"), t("customer_pdf_web_unavailable"));
      return;
    }
    if (!customer) return;
    if (!requirePremium()) return;
    setInvoiceBusyId(tx.id);
    try {
      if (tx.type === "credit") {
        await shareCreditInvoicePdf(customer.id, tx.id, { whatsappPhone: customer.phone });
      } else {
        await sharePaymentReceiptPdf(customer.id, tx.id, { whatsappPhone: customer.phone });
      }
    } catch (e: unknown) {
      Alert.alert(t("error"), e instanceof Error ? e.message : String(e));
    } finally {
      setInvoiceBusyId(null);
    }
  };

  if (!token) {
    return (
      <View style={styles.flex}>
        <MeshBackdrop isDark={isDark} />
        <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
          <Text style={{ color: headline, fontWeight: "700", padding: 20 }}>{t("sign_in_prompt")}</Text>
        </SafeAreaView>
      </View>
    );
  }

  if (!Number.isFinite(customerId) || customerId <= 0) {
    return (
      <View style={styles.flex}>
        <MeshBackdrop isDark={isDark} />
        <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
          <Text style={{ color: BakimateColors.danger, fontWeight: "800", padding: 20 }}>{t("customer_not_found")}</Text>
        </SafeAreaView>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.flex}>
        <MeshBackdrop isDark={isDark} />
        <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
          <ActivityIndicator color={BakimateColors.accentTeal} style={{ marginTop: 28 }} />
        </SafeAreaView>
      </View>
    );
  }

  if (!customer) {
    return (
      <View style={styles.flex}>
        <MeshBackdrop isDark={isDark} />
        <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
          <View style={{ padding: 20 }}>
            <Text style={{ color: BakimateColors.danger, fontWeight: "700" }}>
              {error != null ? apiErrorMessage(error) : t("customer_not_found")}
            </Text>
            <Pressable onPress={() => void refetch()} style={{ marginTop: 16 }}>
              <Text style={{ color: BakimateColors.accentTeal, fontWeight: "800" }}>{t("retry")}</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const openEditCustomer = () => {
    setEditName(customer.name);
    setEditPhone(customer.phone?.trim() ?? "");
    setEditCustomerOpen(true);
  };

  const saveCustomerEdit = () => {
    const name = editName.trim();
    if (!name) {
      Alert.alert(t("error"), t("customer_name_required"));
      return;
    }
    patchCustomerMu.mutate(
      { customerId, payload: { name, phone: editPhone.trim() || null } },
      {
        onSuccess: () => setEditCustomerOpen(false),
        onError: (e: unknown) => {
          if (isAxiosError(e) && e.response?.status === 403) {
            router.push("/paywall");
            return;
          }
          Alert.alert(t("error"), apiErrorMessage(e));
        },
      },
    );
  };

  const confirmDeleteCustomer = () => {
    Alert.alert(t("delete_customer_title"), t("delete_customer_body"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("delete"),
        style: "destructive",
        onPress: () =>
          deleteCustomerMu.mutate(customerId, {
            onSuccess: async () => {
              await clearCustomerPhoto(customerId);
              setEditCustomerOpen(false);
              router.back();
            },
            onError: (e: unknown) => {
              if (isAxiosError(e) && e.response?.status === 403) {
                router.push("/paywall");
                return;
              }
              Alert.alert(t("error"), apiErrorMessage(e));
            },
          }),
      },
    ]);
  };

  const owes = customer.balance_sen > 0;
  const goalRatio = goalProgressPaidRatio(customer.balance_sen, customer.goal_amount_sen ?? null);
  const weekHintSen = suggestedWeeklyPaySen(customer.balance_sen, customer.goal_target_date ?? null);

  return (
    <View style={styles.flex}>
      <MeshBackdrop isDark={isDark} />

      <SafeAreaView style={styles.safe} edges={["top"]}>
        {/* Top bar: back + edit customer */}
        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={16}
            accessibilityRole="button"
            style={({ pressed }) => [styles.backHit, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Ionicons name="chevron-back" size={32} color={headline} />
          </Pressable>
          <View style={{ flex: 1 }} />
          <Pressable
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              openEditCustomer();
            }}
            hitSlop={16}
            accessibilityRole="button"
            accessibilityLabel={t("customer_edit_title")}
            style={({ pressed }) => [styles.backHit, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Ionicons name="create-outline" size={28} color={headline} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollPad}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {isPartialListFallback ? (
            <View
              style={[
                styles.cacheHintPill,
                {
                  borderColor: isDark ? BakimateColors.glassBorderDark : "rgba(15,23,42,0.12)",
                  backgroundColor: isDark ? "rgba(15,23,42,0.55)" : "rgba(255,255,255,0.92)",
                },
              ]}
            >
              <Ionicons name="cloud-offline-outline" size={16} color={BakimateColors.accentTeal} />
              <Text style={[styles.cacheHintText, { color: muted }]}>
                {t("customer_partial_cache_hint")}
              </Text>
            </View>
          ) : null}

          {/* Hero */}
          <View style={styles.heroWrap}>
            <Pressable
              onPress={onChangePhoto}
              onLongPress={onChangePhoto}
              accessibilityRole="imagebutton"
              accessibilityLabel={customer.name}
              style={({ pressed }) => [styles.photoFrame, { opacity: pressed ? 0.85 : 1 }]}
            >
              <PersonAvatar
                name={customer.name}
                customerId={customer.id}
                uriOverride={photoUri}
                size="lg"
                kind="customer"
              />
              <View style={[styles.photoEditBadge, { backgroundColor: BakimateColors.accentTeal }]}>
                <Ionicons name={photoBusy ? "hourglass-outline" : "camera"} size={16} color="#fff" />
              </View>
            </Pressable>

            <Text style={[styles.heroName, { color: headline }]} numberOfLines={2}>
              {customer.name}
            </Text>

            <View style={{ marginTop: 6, alignItems: "center" }}>
              <MoneyDisplay
                sen={customer.balance_sen}
                currencyCode={currency}
                tone={owes ? "debt" : "paid"}
                size="huge"
                align="center"
              />
              <Text style={[styles.heroStatus, { color: owes ? BakimateColors.danger : BakimateColors.success }]}>
                {owes ? t("outstanding_balance") : t("no_balance_hint")}
              </Text>
            </View>

            {customer.reliability_stars && customer.reliability_stars > 0 ? (
              <StarsRow count={customer.reliability_stars} muted={muted} />
            ) : null}

            {(pendingOutbox.data ?? 0) > 0 ? (
              <View style={[styles.syncPill, { borderColor: BakimateColors.danger }]}>
                <Ionicons name="sync-outline" size={14} color={BakimateColors.danger} />
                <Text style={[styles.syncText, { color: BakimateColors.danger }]}>
                  {t("pending_sync_banner", { count: pendingOutbox.data ?? 0 })}
                </Text>
              </View>
            ) : null}

            {/* Phone + next-due compact pill row */}
            {customer.phone || customer.next_due_at ? (
              <View style={styles.metaRow}>
                {customer.phone ? (
                  <View style={styles.metaPill}>
                    <Ionicons name="call-outline" size={16} color={BakimateColors.accentTeal} />
                    <Text style={[styles.metaText, { color: headline }]} numberOfLines={1}>
                      {customer.phone}
                    </Text>
                  </View>
                ) : null}
                {customer.next_due_at ? (
                  <View style={styles.metaPill}>
                    <Ionicons name="calendar-outline" size={16} color={BakimateColors.accentTeal} />
                    <Text style={[styles.metaText, { color: headline }]} numberOfLines={1}>
                      {formatCalendarDateShort(customer.next_due_at, i18n.language)}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>

          {/* Two giant action buttons */}
          <View style={styles.actionRow}>
            <BigActionButton
              onPress={() => openSheet("credit")}
              icon="arrow-up"
              variant="danger"
              size="xl"
              label={t("quick_gave")}
              accessibilityLabel={t("quick_gave")}
              style={styles.actionBtn}
              disabled={premiumBootstrapBlocks}
            />
            <BigActionButton
              onPress={() => openSheet("payment")}
              icon="arrow-down"
              variant="success"
              size="xl"
              label={t("quick_got")}
              accessibilityLabel={t("quick_got")}
              style={styles.actionBtn}
              disabled={premiumBootstrapBlocks}
            />
          </View>

          {/* Secondary actions row: WA remind / share link / QR */}
          <View style={styles.miniActionRow}>
            {owes ? (
              <Pressable
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  void onRemind();
                }}
                accessibilityRole="button"
                accessibilityLabel={t("remind_whatsapp")}
                style={({ pressed }) => [
                  styles.miniBtn,
                  { backgroundColor: "#25D366", opacity: pressed ? 0.88 : 1 },
                ]}
              >
                <Ionicons name="logo-whatsapp" size={26} color="#fff" />
              </Pressable>
            ) : null}

            <Pressable
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                void onShareBalanceLink();
              }}
              disabled={balanceLinkMu.isPending}
              accessibilityRole="button"
              accessibilityLabel={t("customer_balance_link")}
              style={({ pressed }) => [
                styles.miniBtn,
                {
                  backgroundColor: BakimateColors.accentTeal,
                  opacity: balanceLinkMu.isPending ? 0.6 : pressed ? 0.88 : 1,
                },
              ]}
            >
              {balanceLinkMu.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Ionicons name="link" size={26} color="#fff" />
              )}
            </Pressable>

            <Pressable
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                openDuitnowQr();
              }}
              accessibilityRole="button"
              accessibilityLabel={t("duitnow_show_qr")}
              style={({ pressed }) => [
                styles.miniBtn,
                {
                  backgroundColor: isDark ? "rgba(15,23,42,0.7)" : "rgba(255,255,255,0.95)",
                  borderWidth: 1.5,
                  borderColor: BakimateColors.accentTeal,
                  opacity: pressed ? 0.88 : 1,
                },
              ]}
            >
              <Ionicons name="qr-code" size={26} color={BakimateColors.accentTeal} />
            </Pressable>
          </View>

          <View style={styles.moreSection}>
              {goalRatio !== null ? (
                <GlassSurface isDark={isDark} style={styles.card} contentStyle={styles.cardPad}>
                  <GoalProgressRing
                    ratio={goalRatio}
                    label={t("qist_progress_title")}
                    subLabel={
                      weekHintSen !== null
                        ? t("qist_weekly_suggested", { amount: formatMoneyMinor(weekHintSen, currency, i18n.language) })
                        : undefined
                    }
                    isDark={isDark}
                  />
                  {customer.goal_target_date ? (
                    <Text style={[styles.cardFoot, { color: muted }]}>
                      {t("qist_pay_full_by")}: {formatCalendarDateShort(customer.goal_target_date, i18n.language)}
                    </Text>
                  ) : null}
                </GlassSurface>
              ) : null}

              {/* Promises */}
              <GlassSurface isDark={isDark} style={styles.card} contentStyle={styles.cardPad}>
                <View style={styles.cardHeadRow}>
                  <Ionicons name="chatbubbles-outline" size={22} color={BakimateColors.accentTeal} />
                  <Text style={[styles.cardTitle, { color: headline }]}>{t("promise_card_title")}</Text>
                </View>

                {(customer.promises ?? []).length === 0 ? (
                  <Text style={[styles.cardEmpty, { color: muted }]}>{t("promise_card_hint")}</Text>
                ) : (
                  <View style={{ marginTop: 8, gap: 8 }}>
                    {(customer.promises ?? []).map((p) => (
                      <Pressable
                        key={p.id}
                        onPress={() => openPromiseResolution(p)}
                        disabled={p.status !== "pending" || patchPromiseMu.isPending}
                        style={[
                          styles.promiseRow,
                          {
                            borderColor: isDark ? BakimateColors.glassBorderDark : "rgba(15,23,42,0.1)",
                            opacity: p.status !== "pending" ? 0.7 : 1,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.promiseDot,
                            {
                              backgroundColor:
                                p.status === "kept"
                                  ? BakimateColors.success
                                  : p.status === "missed"
                                    ? BakimateColors.danger
                                    : p.status === "cancelled"
                                      ? muted
                                      : BakimateColors.accentTeal,
                            },
                          ]}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.promiseAmt, { color: headline }]}>
                            {formatMoneyMinor(p.amount_sen, currency, i18n.language)}
                          </Text>
                          <Text style={[styles.promiseMeta, { color: muted }]}>
                            {formatCalendarDateShort(p.promised_date, i18n.language)}
                          </Text>
                        </View>
                        {p.status === "pending" ? (
                          <Ionicons name="chevron-forward" size={20} color={muted} />
                        ) : null}
                      </Pressable>
                    ))}
                  </View>
                )}

                <Pressable
                  disabled={createPromiseMu.isPending}
                  onPress={gateOpenPromiseModal}
                  style={({ pressed }) => [
                    styles.cardAddBtn,
                    {
                      backgroundColor: "rgba(46, 196, 182, 0.12)",
                      borderColor: BakimateColors.accentTeal,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <Ionicons name="add" size={20} color={BakimateColors.accentTeal} />
                  <Text style={{ fontWeight: "900", color: BakimateColors.accentTeal }}>{t("promise_add")}</Text>
                </Pressable>
              </GlassSurface>

              {/* Recent credits / payments — A4 PDF per row */}
              <GlassSurface isDark={isDark} style={styles.card} contentStyle={styles.cardPad}>
                <View style={styles.cardHeadRow}>
                  <Ionicons name="list-outline" size={22} color={BakimateColors.accentTeal} />
                  <Text style={[styles.cardTitle, { color: headline }]}>{t("customer_recent_tx")}</Text>
                </View>

                {(customer.recent_transactions ?? []).length === 0 ? (
                  <Text style={[styles.cardEmpty, { color: muted }]}>{t("customer_tx_empty")}</Text>
                ) : (
                  <View style={{ marginTop: 8, gap: 10 }}>
                    {(customer.recent_transactions ?? []).map((tx) => {
                      const isCredit = tx.type === "credit";
                      const accent = isCredit ? BakimateColors.danger : BakimateColors.success;
                      const itemLine =
                        isCredit && tx.item_key?.trim()
                          ? t("customer_tx_item", { name: tx.item_key.trim() })
                          : null;
                      return (
                        <View
                          key={tx.id}
                          style={[
                            styles.txRow,
                            {
                              backgroundColor: isDark ? "rgba(15, 23, 42, 0.45)" : "rgba(255, 255, 255, 0.65)",
                              borderColor: isDark ? BakimateColors.glassBorderDark : "rgba(15,23,42,0.1)",
                            },
                          ]}
                        >
                          <View style={[styles.txIcon, { backgroundColor: `${accent}1F` }]}>
                            <Ionicons name={isCredit ? "arrow-up" : "arrow-down"} size={20} color={accent} />
                          </View>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={[styles.txTitle, { color: headline }]} numberOfLines={1}>
                              {isCredit ? t("customer_tx_credit") : t("customer_tx_payment")}
                            </Text>
                            {itemLine ? (
                              <Text style={[styles.txNote, { color: muted }]} numberOfLines={1}>
                                {itemLine}
                              </Text>
                            ) : null}
                            {tx.note ? (
                              <Text style={[styles.txNote, { color: muted }]} numberOfLines={2}>
                                {tx.note}
                              </Text>
                            ) : null}
                            {tx.created_at ? (
                              <Text style={[styles.txDate, { color: muted }]}>
                                {formatCalendarDateShort(tx.created_at, i18n.language)}
                              </Text>
                            ) : null}
                          </View>
                          <View style={styles.txTrailingCol}>
                            <View style={styles.txAmtRow}>
                              <Text style={[styles.txAmt, { color: accent }]}>
                                {isCredit ? "+" : "−"}
                                {formatMoneyMinor(tx.amount_sen, currency, i18n.language)}
                              </Text>
                              <View style={styles.txLedgerIconActions}>
                                <Pressable
                                  accessibilityRole="button"
                                  accessibilityLabel={
                                    isCredit
                                      ? t("customer_tx_edit_credit_a11y")
                                      : t("customer_tx_edit_payment_a11y")
                                  }
                                  hitSlop={12}
                                  disabled={invoiceBusyId !== null || deleteLedgerTxMu.isPending}
                                  onPress={() => openEditLedgerTx(tx)}
                                  style={({ pressed }) => [
                                    styles.txIconActionWrap,
                                    {
                                      backgroundColor: isCredit
                                        ? isDark
                                          ? `${BakimateColors.danger}20`
                                          : `${BakimateColors.danger}16`
                                        : isDark
                                          ? `${BakimateColors.success}20`
                                          : `${BakimateColors.success}16`,
                                      opacity: pressed ? 0.78 : 1,
                                    },
                                  ]}
                                >
                                  <Ionicons
                                    name="create-outline"
                                    size={20}
                                    color={isCredit ? BakimateColors.danger : BakimateColors.success}
                                  />
                                </Pressable>
                                <Pressable
                                  accessibilityRole="button"
                                  accessibilityLabel={
                                    isCredit
                                      ? t("customer_tx_delete_credit_a11y")
                                      : t("customer_tx_delete_payment_a11y")
                                  }
                                  hitSlop={12}
                                  disabled={invoiceBusyId !== null || deleteLedgerTxMu.isPending}
                                  onPress={() => {
                                    if (!requirePremium()) return;
                                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                                    confirmDeleteLedgerTx(tx);
                                  }}
                                  style={({ pressed }) => [
                                    styles.txIconActionWrap,
                                    {
                                      backgroundColor: isDark
                                        ? `${BakimateColors.danger}22`
                                        : `${BakimateColors.danger}18`,
                                      opacity: pressed ? 0.78 : 1,
                                    },
                                  ]}
                                >
                                  <Ionicons name="trash-outline" size={20} color={BakimateColors.danger} />
                                </Pressable>
                              </View>
                            </View>
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={t("customer_tx_pdf_a11y")}
                              hitSlop={8}
                              disabled={invoiceBusyId !== null}
                              onPress={() => void openSingleEntryPdf(tx)}
                              style={({ pressed }) => [
                                styles.txPdfPill,
                                {
                                  borderColor: BakimateColors.accentTeal,
                                  backgroundColor: isDark
                                    ? "rgba(46, 196, 182, 0.12)"
                                    : "rgba(46, 196, 182, 0.1)",
                                  opacity: invoiceBusyId === tx.id ? 1 : pressed ? 0.82 : 1,
                                },
                              ]}
                            >
                              {invoiceBusyId === tx.id ? (
                                <ActivityIndicator size="small" color={BakimateColors.accentTeal} />
                              ) : (
                                <>
                                  <Ionicons
                                    name="document-text-outline"
                                    size={18}
                                    color={BakimateColors.accentTeal}
                                  />
                                  <Text style={[styles.txPdfPillText, { color: BakimateColors.accentTeal }]}>
                                    {t("customer_tx_pdf_btn")}
                                  </Text>
                                </>
                              )}
                            </Pressable>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </GlassSurface>

              {/* Documents */}
              <GlassSurface isDark={isDark} style={styles.card} contentStyle={styles.cardPad}>
                <View style={styles.cardHeadRow}>
                  <Ionicons name="document-text-outline" size={22} color={BakimateColors.accentTeal} />
                  <Text style={[styles.cardTitle, { color: headline }]}>{t("customer_documents_title")}</Text>
                </View>

                <View style={styles.docRow}>
                  <Pressable
                    disabled={pdfBusy !== null}
                    onPress={() => void shareLedgerOrSettlement("ledger")}
                    style={({ pressed }) => [
                      styles.docBtn,
                      {
                        borderColor: isDark ? BakimateColors.glassBorderDark : "rgba(15,23,42,0.12)",
                        opacity: pdfBusy !== null ? 0.55 : pressed ? 0.88 : 1,
                      },
                    ]}
                  >
                    {pdfBusy === "ledger" ? (
                      <ActivityIndicator color={BakimateColors.accentTeal} />
                    ) : (
                      <>
                        <Ionicons name="download-outline" size={26} color={BakimateColors.accentTeal} />
                        <Text style={[styles.docBtnText, { color: headline }]} numberOfLines={2}>
                          {t("customer_download_ledger_pdf")}
                        </Text>
                      </>
                    )}
                  </Pressable>

                  <Pressable
                    disabled={pdfBusy !== null || customer.balance_sen !== 0}
                    onPress={() => void shareLedgerOrSettlement("settlement")}
                    style={({ pressed }) => [
                      styles.docBtn,
                      {
                        borderColor: isDark ? BakimateColors.glassBorderDark : "rgba(15,23,42,0.12)",
                        opacity: pdfBusy !== null || customer.balance_sen !== 0 ? 0.45 : pressed ? 0.88 : 1,
                      },
                    ]}
                  >
                    {pdfBusy === "settlement" ? (
                      <ActivityIndicator color={BakimateColors.accentTeal} />
                    ) : (
                      <>
                        <Ionicons name="ribbon-outline" size={26} color={BakimateColors.accentTeal} />
                        <Text style={[styles.docBtnText, { color: headline }]} numberOfLines={2}>
                          {t("customer_settlement_pdf")}
                        </Text>
                      </>
                    )}
                  </Pressable>
                </View>
                {customer.balance_sen !== 0 ? (
                  <Text style={[styles.cardFoot, { color: muted }]}>{t("customer_settlement_locked_hint")}</Text>
                ) : null}
              </GlassSurface>
            </View>
        </ScrollView>
      </SafeAreaView>

      {/* Edit customer: name, phone, delete */}
      <BottomSheet
        visible={editCustomerOpen}
        onClose={() => setEditCustomerOpen(false)}
        isDark={isDark}
        scrollable
      >
        <Text style={[styles.cardTitle, { color: headline, marginBottom: 8 }]}>{t("customer_edit_title")}</Text>

        <Text style={[styles.label, { color: muted }]}>{t("customer_name")}</Text>
        <TextInput
          value={editName}
          onChangeText={setEditName}
          autoCapitalize="words"
          style={[
            styles.input,
            { borderColor: isDark ? BakimateColors.glassBorderDark : "rgba(15,23,42,0.12)", color: headline },
          ]}
        />

        <Text style={[styles.label, { color: muted }]}>{t("phone_optional")}</Text>
        <TextInput
          value={editPhone}
          onChangeText={setEditPhone}
          keyboardType="phone-pad"
          style={[
            styles.input,
            { borderColor: isDark ? BakimateColors.glassBorderDark : "rgba(15,23,42,0.12)", color: headline },
          ]}
        />

        <Pressable
          onPress={() => void saveCustomerEdit()}
          disabled={patchCustomerMu.isPending}
          style={({ pressed }) => [
            styles.editSaveBtn,
            {
              backgroundColor: BakimateColors.primary,
              opacity: patchCustomerMu.isPending ? 0.6 : pressed ? 0.9 : 1,
            },
          ]}
        >
          {patchCustomerMu.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.editSaveBtnText}>{t("customer_save_changes")}</Text>
          )}
        </Pressable>

        <Pressable
          onPress={() => confirmDeleteCustomer()}
          disabled={deleteCustomerMu.isPending}
          style={({ pressed }) => [
            styles.editDeleteBtn,
            {
              borderColor: BakimateColors.danger,
              opacity: deleteCustomerMu.isPending ? 0.6 : pressed ? 0.88 : 1,
            },
          ]}
        >
          <Ionicons name="trash-outline" size={20} color={BakimateColors.danger} />
          <Text style={[styles.editDeleteBtnText, { color: BakimateColors.danger }]}>{t("delete_customer")}</Text>
        </Pressable>
      </BottomSheet>

      {/* Record transaction sheet */}
      {customer ? (
        <RecordTransactionSheet
          visible={sheetType !== null}
          mode={sheetType}
          editingTransaction={editingTx}
          customer={customer}
          currency={currency}
          isDark={isDark}
          quickItems={quickItems}
          duitnowQrUrl={duitnowQrUrl || null}
          onClose={() => {
            setSheetType(null);
            setEditingTx(null);
          }}
          onOpenDuitnowQr={openDuitnowQr}
          onSaved={() => void refetch()}
        />
      ) : null}

      {/* Promise sheet (kept simple — text inputs, hidden behind chevron) */}
      <BottomSheet visible={promiseOpen} onClose={() => setPromiseOpen(false)} isDark={isDark} scrollable>
        <Text style={[styles.cardTitle, { color: headline, marginBottom: 8 }]}>{t("promise_sheet_title")}</Text>

        <Text style={[styles.label, { color: muted }]}>{t("promise_amount_label")}</Text>
        <TextInput
          value={promiseAmtRm}
          onChangeText={setPromiseAmtRm}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor={muted}
          style={[styles.input, { borderColor: isDark ? BakimateColors.glassBorderDark : "rgba(15,23,42,0.12)", color: headline }]}
        />

        <Text style={[styles.label, { color: muted }]}>{t("promise_date_label")}</Text>
        <View style={styles.promisePresets}>
          {[
            { d: addDaysLocal(3), n: 3 },
            { d: addDaysLocal(7), n: 7 },
            { d: addDaysLocal(14), n: 14 },
            { d: addDaysLocal(30), n: 30 },
          ].map(({ d, n }) => {
            const sel = promiseDateYmd === d;
            return (
              <Pressable
                key={n}
                onPress={() => setPromiseDateYmd(d)}
                style={[
                  styles.promisePresetChip,
                  { borderColor: sel ? BakimateColors.accentTeal : BakimateColors.border, backgroundColor: sel ? "rgba(46,196,182,0.15)" : "transparent" },
                ]}
              >
                <Ionicons name="calendar-outline" size={16} color={sel ? BakimateColors.accentTeal : headline} />
                <Text style={{ fontWeight: "900", color: sel ? BakimateColors.accentTeal : headline }}>{n}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.label, { color: muted }]}>{t("promise_note_label")}</Text>
        <TextInput
          value={promiseNoteText}
          onChangeText={setPromiseNoteText}
          placeholder="—"
          placeholderTextColor={muted}
          multiline
          style={[styles.input, { minHeight: 64, textAlignVertical: "top", borderColor: isDark ? BakimateColors.glassBorderDark : "rgba(15,23,42,0.12)", color: headline }]}
        />

        <View style={styles.sheetFooter}>
          <BigActionButton
            onPress={() => setPromiseOpen(false)}
            icon="close"
            variant="danger"
            size="lg"
            accessibilityLabel={t("cancel")}
            style={{ flex: 1 }}
          />
          <BigActionButton
            onPress={() => void createPromiseMu.mutate()}
            icon="checkmark"
            variant="success"
            size="lg"
            accessibilityLabel={t("promise_save")}
            disabled={createPromiseMu.isPending}
            style={{ flex: 1 }}
          />
        </View>
      </BottomSheet>

      {/* DuitNow QR fullscreen */}
      <Modal
        visible={duitnowQrOpen}
        animationType="fade"
        transparent
        statusBarTranslucent
        onRequestClose={() => setDuitnowQrOpen(false)}
      >
        <View style={styles.qrModalRoot}>
          <SafeAreaView style={{ flex: 1, paddingHorizontal: 20 }} edges={["top", "bottom"]}>
            <Pressable
              onPress={() => setDuitnowQrOpen(false)}
              accessibilityRole="button"
              accessibilityLabel={t("duitnow_qr_close")}
              style={styles.qrCloseTop}
            >
              <Ionicons name="close" size={28} color="#fff" />
            </Pressable>

            <View style={styles.qrImageWrap}>
              {duitnowQrUrl ? (
                <Image source={{ uri: duitnowQrUrl }} style={styles.qrImage} contentFit="contain" />
              ) : null}
            </View>
          </SafeAreaView>
        </View>
      </Modal>

      {/* Subtle gradient that softens the action buttons against the mesh — only when sheet is closed */}
      {sheetType ? null : (
        <LinearGradient
          pointerEvents="none"
          colors={isDark ? ["transparent", "rgba(11,18,32,0.45)"] : ["transparent", "rgba(241,245,249,0.45)"]}
          style={styles.bottomFade}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: "transparent" },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 8,
    paddingTop: 4,
    paddingBottom: 6,
  },
  backHit: { padding: 6 },

  scrollPad: { paddingHorizontal: 20, paddingBottom: 60, flexGrow: 1 },

  heroWrap: { alignItems: "center", paddingTop: 4, paddingBottom: 16 },
  photoFrame: { position: "relative" },
  photoEditBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  heroName: { marginTop: 14, fontSize: 24, fontWeight: "900", textAlign: "center", letterSpacing: -0.4 },
  heroStatus: { marginTop: 6, fontSize: 13, fontWeight: "800", letterSpacing: 0.3, textTransform: "uppercase" },

  starRow: { flexDirection: "row", alignItems: "center", marginTop: 10 },

  syncPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  syncText: { fontSize: 12, fontWeight: "800" },

  cacheHintPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  cacheHintText: { flex: 1, fontSize: 13, fontWeight: "600", lineHeight: 18 },

  metaRow: {
    marginTop: 14,
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(46, 196, 182, 0.12)",
  },
  metaText: { fontSize: 13, fontWeight: "800" },

  actionRow: { flexDirection: "row", gap: 12, marginTop: 6, marginBottom: 14 },
  actionBtn: { flex: 1 },

  miniActionRow: { flexDirection: "row", gap: 12, justifyContent: "center", marginBottom: 10 },
  miniBtn: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#0f172a",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.18,
        shadowRadius: 12,
      },
      android: { elevation: 4 },
      default: {},
    }),
  },

  moreSection: { gap: 12, marginTop: 12 },

  card: {},
  cardPad: { padding: 18, gap: 10 },
  cardHeadRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  cardTitle: { fontSize: 17, fontWeight: "900" },
  cardEmpty: { fontSize: 13, fontWeight: "700" },
  cardFoot: { fontSize: 12, fontWeight: "700", lineHeight: 17 },
  cardAddBtn: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 13,
  },

  promiseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  promiseDot: { width: 10, height: 28, borderRadius: 4 },
  promiseAmt: { fontWeight: "900", fontSize: 16 },
  promiseMeta: { marginTop: 2, fontSize: 12, fontWeight: "700" },

  docRow: { flexDirection: "row", gap: 10, marginTop: 6 },
  docBtn: {
    flex: 1,
    minHeight: 88,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
  },
  docBtnText: { fontSize: 12, fontWeight: "900", textAlign: "center" },

  txRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  txTrailingCol: { alignItems: "flex-end", gap: 6 },
  txAmtRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" },
  txLedgerIconActions: { flexDirection: "row", alignItems: "center", gap: 6 },
  txIconActionWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  txIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  txTitle: { fontWeight: "900", fontSize: 14 },
  txNote: { marginTop: 2, fontSize: 12, fontWeight: "600" },
  txDate: { marginTop: 2, fontSize: 11, fontWeight: "700" },
  txAmt: { fontWeight: "900", fontSize: 14 },
  txPdfPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    minWidth: 88,
    justifyContent: "center",
  },
  txPdfPillText: { fontWeight: "900", fontSize: 12 },

  label: { fontSize: 12, fontWeight: "800", marginBottom: 6, marginTop: 8 },
  input: { borderWidth: 1, borderRadius: 12, padding: 12, fontWeight: "600", fontSize: 16 },

  promisePresets: { flexDirection: "row", gap: 8, marginTop: 6, marginBottom: 4 },
  promisePresetChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
  },

  sheetFooter: { flexDirection: "row", gap: 12, marginTop: 16 },

  editSaveBtn: {
    marginTop: 16,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  editSaveBtnText: { color: "#fff", fontWeight: "900", fontSize: 16 },
  editDeleteBtn: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 16,
    paddingVertical: 14,
  },
  editDeleteBtnText: { fontWeight: "900", fontSize: 15 },

  qrModalRoot: { flex: 1, backgroundColor: "rgba(0,0,0,0.94)" },
  qrCloseTop: {
    alignSelf: "flex-end",
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  qrImageWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  qrImage: {
    width: "100%",
    maxWidth: 340,
    aspectRatio: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
  },

  bottomFade: { position: "absolute", left: 0, right: 0, bottom: 0, height: 40 },
});
