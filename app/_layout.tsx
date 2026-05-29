import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import * as SplashScreen from "expo-splash-screen";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import { useEffect, useMemo } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AppProviders } from "@/providers/AppProviders";
import { BakimateColors } from "@/constants/bakimate-theme";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useSessionHydrated } from "@/hooks/use-session-hydrated";
import { useSessionStore } from "@/stores/session-store";
import * as WebBrowser from "expo-web-browser";

/** Must run on every cold start so Google OAuth can complete when the app opens on `/oauthredirect`. */
WebBrowser.maybeCompleteAuthSession();

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

  const publicAuthRoutes = useMemo(
    () =>
      new Set([
        "login",
        "register",
        "forgot-password",
        "reset-password",
        "verify-email",
        /** Native Google redirect — must not be redirected to /login before tokens are handled. */
        "oauthredirect",
      ]),
    [],
  );
  const atPublicAuth = segments[0] != null && publicAuthRoutes.has(String(segments[0]));

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    void SplashScreen.hideAsync();

    if (!token && !atPublicAuth) {
      router.replace("/login");
      return;
    }
    if (token && atPublicAuth) {
      router.replace("/(tabs)");
    }
  }, [hydrated, token, router, segments[0]]);

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
        <Stack.Screen name="register" options={{ headerShown: false }} />
        <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
        <Stack.Screen name="reset-password" options={{ headerShown: false }} />
        <Stack.Screen name="verify-email" options={{ headerShown: false }} />
        <Stack.Screen name="oauthredirect" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="shop-settings" options={{ headerShown: false }} />
        <Stack.Screen name="supplier/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="customer/[id]" options={{ headerShown: false }} />
        <Stack.Screen
          name="paywall"
          options={{
            presentation: "modal",
            title: "Premium",
            headerShadowVisible: false,
            headerStyle: {
              backgroundColor: Colors[colorScheme].background,
            },
            headerTintColor: Colors[colorScheme].text,
            headerTitleStyle: {
              fontWeight: "800",
              color: Colors[colorScheme].text,
            },
            contentStyle: {
              backgroundColor: Colors[colorScheme].background,
            },
          }}
        />
      </Stack>
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppProviders>
        <NavigationRoot />
      </AppProviders>
    </SafeAreaProvider>
  );
}
