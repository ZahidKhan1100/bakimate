import { getPrivacyPolicyUrl, getTermsOfUseUrl } from "@/constants/site";
import { paywallPlanTitle } from "@/lib/paywall-plan-copy";
import { paywallSubscriptionDurationLabel } from "@/lib/paywall-subscription-duration";
import type { TFunction } from "i18next";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import type { PurchasesPackage } from "react-native-purchases";

type Props = {
  packages: PurchasesPackage[];
  t: TFunction;
  muted: string;
  accent: string;
};

async function openLegalUrl(url: string): Promise<void> {
  const can = await Linking.canOpenURL(url);
  if (!can) {
    throw new Error("Cannot open link");
  }
  await Linking.openURL(url);
}

/** App Store Guideline 3.1.2(c): subscription title, length, price, privacy + EULA links. */
export function PaywallSubscriptionLegal({ packages, t, muted, accent }: Props) {
  const privacyUrl = getPrivacyPolicyUrl();
  const termsUrl = getTermsOfUseUrl();

  return (
    <View style={styles.wrap}>
      {packages.length > 0 ? (
        <View style={styles.planList}>
          {packages.map((pkg) => {
            const title = paywallPlanTitle(pkg, t);
            const duration = paywallSubscriptionDurationLabel(pkg, t);
            const priceStr =
              typeof pkg.product.priceString === "string" ? pkg.product.priceString.trim() : "";
            const price = priceStr !== "" ? priceStr : t("paywall_price_pending_store");

            return (
              <Text key={pkg.identifier} style={[styles.planLine, { color: muted }]}>
                {t("paywall_subscription_product_line", { title, duration, price })}
              </Text>
            );
          })}
        </View>
      ) : null}

      <Text style={[styles.disclaimer, { color: muted }]}>{t("paywall_legal_auto_renew")}</Text>

      <View style={styles.linkRow}>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={t("legal_privacy_policy")}
          onPress={() => void openLegalUrl(privacyUrl)}
        >
          <Text style={[styles.link, { color: accent }]}>{t("legal_privacy_policy")}</Text>
        </Pressable>
        <Text style={[styles.sep, { color: muted }]}> · </Text>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={t("legal_terms_of_use")}
          onPress={() => void openLegalUrl(termsUrl)}
        >
          <Text style={[styles.link, { color: accent }]}>{t("legal_terms_of_use")}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10, marginTop: 4 },
  planList: { gap: 6 },
  planLine: { fontSize: 12, fontWeight: "600", lineHeight: 17 },
  disclaimer: { fontSize: 11, fontWeight: "600", lineHeight: 16 },
  linkRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "center" },
  link: { fontSize: 13, fontWeight: "800", textDecorationLine: "underline" },
  sep: { fontSize: 13, fontWeight: "700" },
});
