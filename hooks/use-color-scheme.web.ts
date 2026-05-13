import { useUiPreferencesStore } from "@/stores/ui-preferences-store";
import { useEffect, useState } from "react";
import { useColorScheme as useRNColorScheme } from "react-native";

/**
 * Web: after client hydration, resolves the same way as native (system vs Profile override).
 */
export function useColorScheme(): "light" | "dark" {
  const [hydrated, setHydrated] = useState(false);
  const preference = useUiPreferencesStore((s) => s.colorSchemePreference);
  const systemRn = useRNColorScheme();

  useEffect(() => {
    setHydrated(true);
  }, []);

  const system = hydrated ? (systemRn === "dark" ? "dark" : "light") : "light";

  if (!hydrated) {
    return "light";
  }
  if (preference === "light") {
    return "light";
  }
  if (preference === "dark") {
    return "dark";
  }

  return system;
}
