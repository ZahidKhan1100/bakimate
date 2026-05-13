import { AddCustomerSheet } from "@/components/add-customer-sheet";
import { EmptyHero } from "@/components/ui/empty-hero";
import { MeshBackdrop } from "@/components/ui/mesh-backdrop";
import { PersonRow } from "@/components/ui/person-row";
import { SignInHero } from "@/components/ui/sign-in-hero";
import { BakimateColors } from "@/constants/bakimate-theme";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import type { Customer } from "@/lib/api-types";
import { clearCustomerPhoto } from "@/lib/customer-photos";
import { useCustomersPage, useDeleteCustomer } from "@/lib/hooks/useCustomers";
import { useShopCurrency } from "@/lib/hooks/useShopCurrency";
import { shareCustomerReceipt } from "@/lib/share-receipt";
import { useSessionStore } from "@/stores/session-store";
import { Ionicons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Alert, Platform, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const TAB_PAD = Platform.OS === "ios" ? 108 : 96;

export default function CustomersScreen() {
  const { t } = useTranslation();
  const rawScheme = useColorScheme();
  const theme = rawScheme === "dark" ? "dark" : "light";
  const isDark = theme === "dark";
  const headline = Colors[theme].text;
  const muted = isDark ? BakimateColors.neutralTextMutedDark : BakimateColors.neutralText;

  const token = useSessionStore((s) => s.token);
  const shopCurrency = useShopCurrency();

  const { data, isLoading, isRefetching, refetch, error } = useCustomersPage(1, {
    enabled: Boolean(token),
  });

  const deleteMut = useDeleteCustomer();

  const [addOpen, setAddOpen] = useState(false);

  const onLongPress = (item: Customer) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    Alert.alert(item.name, undefined, [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("share"),
        onPress: async () => {
          try {
            await shareCustomerReceipt(item, shopCurrency);
          } catch (e: any) {
            Alert.alert(t("share_failed_title"), e?.message ?? String(e));
          }
        },
      },
      {
        text: t("delete"),
        style: "destructive",
        onPress: () =>
          Alert.alert(t("delete_customer_title"), t("delete_customer_body"), [
            { text: t("cancel"), style: "cancel" },
            {
              text: t("delete"),
              style: "destructive",
              onPress: () =>
                deleteMut.mutate(item.id, {
                  onSuccess: () => {
                    void clearCustomerPhoto(item.id);
                  },
                  onError: (e: any) =>
                    Alert.alert(t("error"), e?.response?.data?.message ?? e?.message ?? String(e)),
                }),
            },
          ]),
      },
    ]);
  };

  if (!token) {
    return (
      <View style={styles.flex}>
        <MeshBackdrop isDark={isDark} />
        <SafeAreaView style={styles.safe} edges={["top"]}>
          <Text style={[styles.title, { color: headline }]}>{t("customers_title")}</Text>
          <SignInHero isDark={isDark} />
        </SafeAreaView>
      </View>
    );
  }

  const rows = data?.data ?? [];

  return (
    <View style={styles.flex}>
      <MeshBackdrop isDark={isDark} />

      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.topRow}>
          <Text style={[styles.title, { color: headline }]}>{t("customers_title")}</Text>
          <Text style={[styles.count, { color: muted }]}>{rows.length}</Text>
        </View>

        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 24 }} color={BakimateColors.accentTeal} />
        ) : error ? (
          <Text style={{ color: BakimateColors.danger, marginTop: 12 }}>{String((error as Error).message)}</Text>
        ) : (
          <View style={styles.listWrap}>
            <FlashList
              data={rows}
              keyExtractor={(item) => String(item.id)}
              refreshControl={
                <RefreshControl
                  refreshing={isRefetching}
                  onRefresh={() => void refetch()}
                  tintColor={BakimateColors.accentTeal}
                />
              }
              contentContainerStyle={{ paddingBottom: TAB_PAD + 80 }}
              ListEmptyComponent={
                <EmptyHero
                  icon="people"
                  title={t("customers_empty")}
                  body={t("add_customer")}
                  isDark={isDark}
                  pointer="down-right"
                />
              }
              renderItem={({ item }) => (
                <PersonRow
                  id={item.id}
                  name={item.name}
                  balanceSen={item.balance_sen}
                  currencyCode={shopCurrency}
                  isDark={isDark}
                  kind="customer"
                  onPress={() => router.push(`/customer/${item.id}`)}
                  onLongPress={() => onLongPress(item)}
                />
              )}
            />
          </View>
        )}
      </SafeAreaView>

      <View style={[styles.fabWrap, { bottom: TAB_PAD - 8 }]} pointerEvents="box-none">
        <Pressable
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
            setAddOpen(true);
          }}
          accessibilityRole="button"
          accessibilityLabel={t("add_customer")}
          style={({ pressed }) => [styles.fab, { opacity: pressed ? 0.9 : 1 }]}
        >
          <Ionicons name="person-add" size={28} color="#fff" />
        </Pressable>
      </View>

      <AddCustomerSheet visible={addOpen} isDark={isDark} onClose={() => setAddOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: "transparent", paddingHorizontal: 20 },
  topRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  title: { fontSize: 32, fontWeight: "900", letterSpacing: -0.6 },
  count: { fontSize: 18, fontWeight: "800" },
  listWrap: { flex: 1, minHeight: 2 },
  fabWrap: { position: "absolute", right: 22, alignItems: "flex-end" },
  fab: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: BakimateColors.success,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: BakimateColors.success,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
      },
      android: { elevation: 8 },
      default: {},
    }),
  },
});
