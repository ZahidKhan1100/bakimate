import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import * as SplashScreen from "expo-splash-screen";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import { useEffect } from "react";

import { AppProviders } from "@/providers/AppProviders";
import { BakimateColors } from "@/constants/bakimate-theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useSessionHydrated } from "@/hooks/use-session-hydrated";
import { useSessionStore } from "@/stores/session-store";

void SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: "(tabs)",
};

function NavigationRoot() {
  const colorScheme = useColorScheme();
  const hydrated = useSessionHydrated();
  const token = useSessionStore((s) => s.token);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    void SplashScreen.hideAsync();
    const atLogin = segments[0] === "login";

    if (!token && !atLogin) {
      router.replace("/login");
      return;
    }
    if (token && atLogin) {
      router.replace("/(tabs)");
    }
  }, [hydrated, token, segments, router]);

  const navTheme =
    colorScheme === "dark"
      ? {
          ...DarkTheme,
          colors: {
            ...DarkTheme.colors,
            primary: BakimateColors.accentTeal,
            background: BakimateColors.backgroundDark,
            card: "transparent",
            text: "#F1F5F9",
            border: "rgba(148, 163, 184, 0.28)",
          },
        }
      : {
          ...DefaultTheme,
          colors: {
            ...DefaultTheme.colors,
            primary: BakimateColors.accentTeal,
            background: BakimateColors.backgroundLight,
            card: "transparent",
            text: BakimateColors.secondary,
            border: BakimateColors.border,
          },
        };

  if (!hydrated) {
    return null;
  }

  return (
    <ThemeProvider value={navTheme}>
      <Stack>
        <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="shop-settings" options={{ headerShown: false }} />
      <Stack.Screen name="supplier/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="customer/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="paywall" options={{ presentation: "modal", title: "Premium" }} />
      </Stack>
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AppProviders>
      <NavigationRoot />
    </AppProviders>
  );
}
