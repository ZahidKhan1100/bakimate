import { AddCustomerSheet } from "@/components/add-customer-sheet";
import { CustomerAlphabetIndex } from "@/components/customer-alphabet-index";
import { CustomerContactRow } from "@/components/customer-contact-row";
import { EmptyHero } from "@/components/ui/empty-hero";
import { ListSearchBar } from "@/components/ui/list-search-bar";
import { SignInHero } from "@/components/ui/sign-in-hero";
import { BakimateColors } from "@/constants/bakimate-theme";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import type { Customer } from "@/lib/api-types";
import { clearCustomerPhoto } from "@/lib/customer-photos";
import { filterCustomers } from "@/lib/filter-customers";
import { groupCustomersByLetter, type CustomerSection } from "@/lib/group-customers-by-letter";
import {
  createSectionListGetItemLayout,
  jumpSectionListToLetter,
} from "@/lib/section-list-jump-to-letter";
import { useCustomersPage, useDeleteCustomer } from "@/lib/hooks/useCustomers";
import { usePullToRefresh } from "@/lib/hooks/usePullToRefresh";
import { useShopCurrency } from "@/lib/hooks/useShopCurrency";
import { shareCustomerReceipt } from "@/lib/share-receipt";
import { useSessionStore } from "@/stores/session-store";
import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  View,
  type ViewToken,
} from "react-native";
import { Text } from "@/components/ui/text";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CustomersScreen() {
  const { t } = useTranslation();
  const rawScheme = useColorScheme();
  const theme = rawScheme === "dark" ? "dark" : "light";
  const isDark = theme === "dark";
  const headline = Colors[theme].text;
  const muted = isDark ? BakimateColors.neutralTextMutedDark : BakimateColors.neutralText;
  const screenBg = isDark ? "#000000" : "#F2F2F7";
  const sectionHeaderBg = isDark ? "#1C1C1E" : "#E5E5EA";

  const token = useSessionStore((s) => s.token);
  const shopCurrency = useShopCurrency();
  const tabBarHeight = useBottomTabBarHeight();
  const listPaddingBottom = tabBarHeight + 24;

  const { data, isLoading, refetch, error } = useCustomersPage(1, {
    enabled: Boolean(token),
  });
  const pullRefresh = usePullToRefresh(() => refetch());

  const deleteMut = useDeleteCustomer();
  const sectionListRef = useRef<SectionList<Customer, CustomerSection>>(null);
  const pendingLetterJump = useRef<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeLetter, setActiveLetter] = useState<string | null>(null);

  const rows = data?.data ?? [];
  const filteredRows = useMemo(
    () => filterCustomers(rows, searchQuery),
    [rows, searchQuery],
  );
  const sections = useMemo(() => groupCustomersByLetter(filteredRows), [filteredRows]);
  const sectionListGetItemLayout = useMemo(
    () => createSectionListGetItemLayout(sections),
    [sections],
  );
  const isSearching = searchQuery.trim().length > 0;
  const countLabel =
    filteredRows.length === 1
      ? t("customers_count_one")
      : t("customers_count", { count: filteredRows.length });

  const onLongPress = (item: Customer) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    Alert.alert(item.name, undefined, [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("share"),
        onPress: async () => {
          try {
            await shareCustomerReceipt(item, shopCurrency);
          } catch (e: unknown) {
            Alert.alert(t("share_failed_title"), e instanceof Error ? e.message : String(e));
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
                  onError: (e: unknown) =>
                    Alert.alert(
                      t("error"),
                      (e as { response?: { data?: { message?: string } } })?.response?.data
                        ?.message ?? (e instanceof Error ? e.message : String(e)),
                    ),
                }),
            },
          ]),
      },
    ]);
  };

  useEffect(() => {
    if (sections.length === 0) {
      setActiveLetter(null);
      return;
    }
    if (!activeLetter || !sections.some((s) => s.title === activeLetter)) {
      setActiveLetter(sections[0].title);
    }
  }, [sections, activeLetter]);

  const sectionsRef = useRef(sections);
  sectionsRef.current = sections;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 8 }).current;

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken<Customer>[] }) => {
      const currentSections = sectionsRef.current;
      let topTitle: string | null = null;
      let topSectionIndex = Infinity;
      for (const token of viewableItems) {
        const title = token.section?.title;
        if (!title) {
          continue;
        }
        const sectionIndex = currentSections.findIndex((s) => s.title === title);
        if (sectionIndex >= 0 && sectionIndex < topSectionIndex) {
          topSectionIndex = sectionIndex;
          topTitle = title;
        }
      }
      if (topTitle) {
        setActiveLetter(topTitle);
      }
    },
  ).current;

  const jumpToLetter = useCallback(
    (letter: string) => {
      setActiveLetter(letter);
      const sectionIndex = jumpSectionListToLetter(sectionListRef.current, sections, letter);
      if (sectionIndex == null) {
        return;
      }
      pendingLetterJump.current = letter;
      void Haptics.selectionAsync().catch(() => {});
    },
    [sections],
  );

  const onScrollToIndexFailed = useCallback(
    (info: { averageItemLength: number; index: number }) => {
      const letter = pendingLetterJump.current;
      const list = sectionListRef.current;
      if (!letter || !list) {
        return;
      }
      const inner = list.getListRef?.();
      inner?.scrollToOffset?.({
        offset: Math.max(0, info.averageItemLength * info.index),
        animated: false,
      });
      setTimeout(() => {
        jumpSectionListToLetter(list, sectionsRef.current, letter);
      }, 80);
    },
    [],
  );

  if (!token) {
    return (
      <View style={[styles.flex, { backgroundColor: screenBg }]}>
        <SafeAreaView style={styles.safe} edges={["top"]}>
          <Text style={[styles.screenTitle, { color: headline }]}>{t("customers_title")}</Text>
          <SignInHero isDark={isDark} />
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: screenBg }]}>
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={[styles.screenTitle, { color: headline }]}>{t("customers_title")}</Text>
            <Text style={[styles.countSubtitle, { color: muted }]}>{countLabel}</Text>
          </View>
          <Pressable
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              setAddOpen(true);
            }}
            accessibilityRole="button"
            accessibilityLabel={t("add_customer")}
            hitSlop={10}
            style={({ pressed }) => [styles.headerAddBtn, { opacity: pressed ? 0.65 : 1 }]}
          >
            <Ionicons name="add" size={28} color={isDark ? BakimateColors.accentTeal : "#3B82F6"} />
          </Pressable>
        </View>

        {rows.length > 0 ? (
          <ListSearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t("customers_search_placeholder")}
            isDark={isDark}
            headlineColor={headline}
            mutedColor={muted}
            variant="contacts"
            accessibilityLabel={t("customers_search_placeholder")}
          />
        ) : null}

        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 12 }} color={BakimateColors.accentTeal} />
        ) : error && rows.length === 0 ? (
          <Text style={{ color: BakimateColors.danger, marginTop: 12, paddingHorizontal: 16 }}>
            {String((error as Error).message)}
          </Text>
        ) : (
          <View style={styles.listWrap}>
            <SectionList
              ref={sectionListRef}
              sections={sections}
              keyExtractor={(item) => String(item.id)}
              getItemLayout={sectionListGetItemLayout}
              stickySectionHeadersEnabled
              refreshControl={
                <RefreshControl
                  refreshing={pullRefresh.refreshing}
                  onRefresh={pullRefresh.onRefresh}
                  tintColor={BakimateColors.accentTeal}
                />
              }
              contentContainerStyle={{ paddingBottom: listPaddingBottom, paddingRight: 28 }}
              onScrollToIndexFailed={onScrollToIndexFailed}
              onViewableItemsChanged={onViewableItemsChanged}
              viewabilityConfig={viewabilityConfig}
              ListEmptyComponent={
                isSearching && rows.length > 0 ? (
                  <EmptyHero
                    icon="search"
                    title={t("customers_search_empty_title")}
                    body={t("customers_search_empty_body")}
                    isDark={isDark}
                  />
                ) : (
                  <EmptyHero
                    icon="people"
                    title={t("customers_empty")}
                    body={t("add_customer")}
                    isDark={isDark}
                    pointer="down-right"
                  />
                )
              }
              renderSectionHeader={({ section }) => (
                <View style={[styles.sectionHeader, { backgroundColor: sectionHeaderBg }]}>
                  <Text style={[styles.sectionLetter, { color: muted }]}>{section.title}</Text>
                </View>
              )}
              renderItem={({ item }) => (
                <CustomerContactRow
                  id={item.id}
                  name={item.name}
                  phone={item.phone}
                  balanceSen={item.balance_sen}
                  currencyCode={shopCurrency}
                  isDark={isDark}
                  onPress={() => router.push(`/customer/${item.id}`)}
                  onLongPress={() => onLongPress(item)}
                />
              )}
            />
            {sections.length > 0 && !isSearching ? (
              <CustomerAlphabetIndex
                sectionTitles={sections.map((s) => s.title)}
                activeLetter={activeLetter}
                onJump={jumpToLetter}
                isDark={isDark}
              />
            ) : null}
          </View>
        )}
      </SafeAreaView>

      <AddCustomerSheet visible={addOpen} isDark={isDark} onClose={() => setAddOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: 12 },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  headerText: { flex: 1, minWidth: 0 },
  headerAddBtn: { paddingTop: 4, paddingLeft: 8 },
  screenTitle: { fontSize: 34, fontWeight: "700", letterSpacing: 0.4 },
  countSubtitle: { marginTop: 2, fontSize: 15, fontWeight: "400" },
  listWrap: { flex: 1, minHeight: 2, overflow: "visible" },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  sectionLetter: { fontSize: 15, fontWeight: "700" },
});
