import { AddCustomerSheet } from "@/components/add-customer-sheet";
import { CustomerContactRow } from "@/components/customer-contact-row";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { ListSearchBar } from "@/components/ui/list-search-bar";
import { BakimateColors } from "@/constants/bakimate-theme";
import { Colors } from "@/constants/theme";
import { filterCustomers } from "@/lib/filter-customers";
import { useCustomersPage } from "@/lib/hooks/useCustomers";
import { useShopCurrency } from "@/lib/hooks/useShopCurrency";
import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { Text } from "@/components/ui/text";

type Props = {
  /** Which record sheet the customer page should open once a customer is chosen. */
  mode: "credit" | "payment" | null;
  isDark: boolean;
  onClose: () => void;
  onPick: (customerId: number, mode: "credit" | "payment") => void;
};

/** Home shortcut: "Who is this for?" list that hands off to the customer's record sheet. */
export function PickCustomerSheet({ mode, isDark, onClose, onPick }: Props) {
  const { t } = useTranslation();
  const headline = Colors[isDark ? "dark" : "light"].text;
  const muted = isDark ? BakimateColors.neutralTextMutedDark : BakimateColors.neutralText;
  const currency = useShopCurrency();
  const [query, setQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  const { data, isLoading } = useCustomersPage(1, { enabled: mode !== null });
  const rows = useMemo(() => filterCustomers(data?.data ?? [], query), [data, query]);

  const accent = mode === "payment" ? BakimateColors.success : BakimateColors.danger;

  const close = () => {
    setQuery("");
    onClose();
  };

  return (
    <>
      <BottomSheet visible={mode !== null && !addOpen} onClose={close} isDark={isDark} scrollable>
        <Text style={[styles.title, { color: accent }]}>
          {mode === "payment" ? t("quick_got") : t("quick_gave")}
        </Text>
        <Text style={[styles.subtitle, { color: headline }]}>{t("pick_customer_title")}</Text>

        <ListSearchBar
          value={query}
          onChangeText={setQuery}
          placeholder={t("customers_search_placeholder")}
          isDark={isDark}
          headlineColor={headline}
          mutedColor={muted}
        />

        <Pressable
          onPress={() => setAddOpen(true)}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.addRow,
            { borderColor: BakimateColors.accentTeal, opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <Ionicons name="person-add" size={22} color={BakimateColors.accentTeal} />
          <Text style={[styles.addText, { color: BakimateColors.accentTeal }]}>{t("add_customer")}</Text>
        </Pressable>

        {isLoading ? (
          <ActivityIndicator style={{ marginVertical: 24 }} color={BakimateColors.accentTeal} />
        ) : rows.length === 0 ? (
          <Text style={[styles.empty, { color: muted }]}>
            {query.trim() ? t("customers_search_empty_title") : t("pick_customer_empty")}
          </Text>
        ) : (
          <View style={styles.list}>
            {rows.map((c) => (
              <CustomerContactRow
                key={c.id}
                id={c.id}
                name={c.name}
                phone={c.phone}
                balanceSen={c.balance_sen}
                currencyCode={currency}
                isDark={isDark}
                onPress={() => {
                  if (!mode) return;
                  setQuery("");
                  onPick(c.id, mode);
                }}
              />
            ))}
          </View>
        )}
      </BottomSheet>

      <AddCustomerSheet visible={addOpen} onClose={() => setAddOpen(false)} isDark={isDark} />
    </>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: "900", textAlign: "center", marginTop: 4 },
  subtitle: { fontSize: 17, fontWeight: "700", textAlign: "center", marginTop: 4, marginBottom: 14 },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: 16,
    paddingVertical: 14,
    marginTop: 12,
    marginBottom: 8,
  },
  addText: { fontSize: 16, fontWeight: "800" },
  list: { marginHorizontal: -16 },
  empty: { fontSize: 15, fontWeight: "600", textAlign: "center", marginVertical: 24 },
});
