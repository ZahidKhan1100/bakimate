import { BakimateColors } from "@/constants/bakimate-theme";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  View,
  type TextInputProps,
} from "react-native";
import { TextInput } from "@/components/ui/text";

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  isDark: boolean;
  headlineColor: string;
  mutedColor: string;
  accessibilityLabel?: string;
  /** `contacts` = flat pill on dark list (phone contacts style). */
  variant?: "default" | "contacts";
} & Pick<TextInputProps, "returnKeyType" | "autoCorrect" | "autoCapitalize">;

/**
 * Glass-style search field for person lists (customers, etc.).
 */
export function ListSearchBar({
  value,
  onChangeText,
  placeholder,
  isDark,
  headlineColor,
  mutedColor,
  accessibilityLabel,
  variant = "default",
  returnKeyType = "search",
  autoCorrect = false,
  autoCapitalize = "none",
}: Props) {
  const [focused, setFocused] = useState(false);
  const isContacts = variant === "contacts";
  const accent = isDark ? BakimateColors.accentTeal : BakimateColors.primary;
  const border = isContacts
    ? "transparent"
    : focused
      ? accent
      : isDark
        ? BakimateColors.glassBorderDark
        : "rgba(15, 23, 42, 0.1)";
  const fill = isContacts
    ? isDark
      ? "rgba(38, 38, 42, 0.95)"
      : "rgba(229, 231, 235, 0.95)"
    : isDark
      ? "rgba(15, 23, 42, 0.55)"
      : "rgba(255, 255, 255, 0.82)";

  return (
    <View
      style={[
        styles.wrap,
        {
          borderColor: border,
          backgroundColor: fill,
          ...(!isContacts &&
            Platform.select({
              ios: focused
                ? {
                    shadowColor: accent,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: isDark ? 0.35 : 0.18,
                    shadowRadius: 10,
                  }
                : {
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: isDark ? 0.2 : 0.06,
                    shadowRadius: 6,
                  },
              android: { elevation: focused ? 4 : 1 },
              default: {},
            })),
        },
      ]}
    >
      <Ionicons
        name={focused ? "search" : "search-outline"}
        size={20}
        color={focused ? accent : mutedColor}
        style={styles.leadingIcon}
      />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={mutedColor}
        style={[styles.input, { color: headlineColor }]}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        returnKeyType={returnKeyType}
        autoCorrect={autoCorrect}
        autoCapitalize={autoCapitalize}
        clearButtonMode="never"
        accessibilityLabel={accessibilityLabel ?? placeholder}
      />
      {value.length > 0 ? (
        <Pressable
          onPress={() => onChangeText("")}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          style={({ pressed }) => [styles.clearBtn, { opacity: pressed ? 0.65 : 1 }]}
        >
          <Ionicons name="close-circle" size={22} color={mutedColor} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    minHeight: 48,
    marginBottom: 8,
  },
  leadingIcon: { marginRight: 10 },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    paddingVertical: Platform.OS === "ios" ? 12 : 8,
  },
  clearBtn: { marginLeft: 6, padding: 2 },
});
