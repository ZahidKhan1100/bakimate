import { useColorScheme as useRNColorScheme } from "react-native";

import { useUiPreferencesStore } from "@/stores/ui-preferences-store";

/**
 * Effective color scheme for UI: respects Profile → Appearance when not `system`;
 * otherwise follows the device (`light` / `dark`; `null` from RN is treated as light).
 */
export function useColorScheme(): "light" | "dark" {
  const preference = useUiPreferencesStore((s) => s.colorSchemePreference);
  const system = useRNColorScheme();

  if (preference === "light") {
    return "light";
  }
  if (preference === "dark") {
    return "dark";
  }

  return system === "dark" ? "dark" : "light";
}
