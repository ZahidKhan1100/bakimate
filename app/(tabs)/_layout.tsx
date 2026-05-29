import { Tabs } from "expo-router";
import { BlurView } from "expo-blur";
import React from "react";
import { useTranslation } from "react-i18next";
import { Platform, StyleSheet, View, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { BakimateColors } from "@/constants/bakimate-theme";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

type IconName = "house.fill" | "chart.bar.fill" | "person.2.fill" | "shippingbox.fill" | "person.fill";

type TabIconProps = { focused: boolean; color: string; name: IconName; isDark: boolean };

function TabIcon({ focused, color, name, isDark }: TabIconProps) {
  const pillStyle: ViewStyle = focused
    ? {
        backgroundColor: isDark ? "rgba(46, 196, 182, 0.22)" : "rgba(46, 196, 182, 0.18)",
      }
    : {};
  return (
    <View style={[styles.iconPill, pillStyle]}>
      <IconSymbol size={32} name={name} color={color} />
    </View>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === "dark" ? "dark" : "light";
  const isDark = theme === "dark";
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  /** Clear system nav buttons / gesture indicator (many Android builds report inset 0). */
  const homeBottomInset = Platform.OS === "android" ? Math.max(insets.bottom, 28) : insets.bottom;
  /** Cushion above the OS chrome so icons/labels aren’t cramped. */
  const bottomPad = homeBottomInset + (Platform.OS === "ios" ? 8 : 10);
  const tabBarInnerHeight = Platform.OS === "ios" ? 60 : 58;

  const tabBarBg = () =>
    Platform.OS === "ios" ? (
      <BlurView intensity={isDark ? 70 : 82} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
    ) : (
      <View
        style={[
          StyleSheet.absoluteFillObject,
          {
            backgroundColor: isDark ? "rgba(15, 23, 42, 0.94)" : "rgba(255, 255, 255, 0.93)",
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: isDark ? BakimateColors.glassBorderDark : BakimateColors.border,
          },
        ]}
      />
    );

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[theme].tint,
        tabBarInactiveTintColor: Colors[theme].tabIconDefault,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: "transparent",
          borderTopWidth: 0,
          elevation: 0,
          /** Total height includes bottom safe area — avoids overlapping system nav/gesture strip. */
          height: tabBarInnerHeight + bottomPad,
          paddingBottom: bottomPad,
          paddingTop: Platform.OS === "ios" ? 6 : 4,
        },
        tabBarBackground: tabBarBg,
        tabBarLabelStyle: {
          fontWeight: "800",
          fontSize: 11,
          marginBottom: 0,
          marginTop: Platform.OS === "android" ? 2 : 0,
        },
        tabBarItemStyle: { paddingTop: Platform.OS === "ios" ? 6 : 4 },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t("tab_home"),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} color={color} name="house.fill" isDark={isDark} />
          ),
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: t("tab_insights"),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} color={color} name="chart.bar.fill" isDark={isDark} />
          ),
        }}
      />
      <Tabs.Screen
        name="customers"
        options={{
          title: t("tab_customers"),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} color={color} name="person.2.fill" isDark={isDark} />
          ),
        }}
      />
      <Tabs.Screen
        name="suppliers"
        options={{
          title: t("tab_suppliers"),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} color={color} name="shippingbox.fill" isDark={isDark} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: t("tab_more"),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} color={color} name="person.fill" isDark={isDark} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconPill: {
    minWidth: 58,
    minHeight: 40,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
});
