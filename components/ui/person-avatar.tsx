import { initialFromName, nameToSwatch } from "@/lib/avatar-color";
import { useCustomerPhoto } from "@/lib/customer-photos";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

type Size = "sm" | "md" | "lg" | "xl";
type Kind = "customer" | "supplier";

type Props = {
  name: string | null | undefined;
  /** When provided, looks up the locally-saved photo for that id. */
  customerId?: number | null;
  /** Direct URI override (used by the add-customer sheet before the row exists). */
  uriOverride?: string | null;
  size?: Size;
  kind?: Kind;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

const SIZES: Record<Size, { box: number; font: number; icon: number }> = {
  sm: { box: 40, font: 16, icon: 18 },
  md: { box: 56, font: 22, icon: 24 },
  lg: { box: 96, font: 38, icon: 40 },
  xl: { box: 128, font: 52, icon: 56 },
};

/**
 * Photo-first avatar. If the customer has a locally-stored photo we show it;
 * otherwise we render a deterministic color circle with the first letter so
 * non-readers can still recognize people by color + shape. Suppliers fall
 * back to a parcel pictogram instead of a letter.
 */
export function PersonAvatar({
  name,
  customerId,
  uriOverride,
  size = "md",
  kind = "customer",
  onPress,
  onLongPress,
  style,
}: Props) {
  const sz = SIZES[size];
  const storedUri = useCustomerPhoto(customerId ?? null);
  const uri = uriOverride ?? storedUri ?? null;
  const swatch = nameToSwatch(name);
  const interactive = Boolean(onPress || onLongPress);

  const body = uri ? (
    <Image
      source={{ uri }}
      style={[styles.image, { width: sz.box, height: sz.box, borderRadius: sz.box / 2 }]}
      contentFit="cover"
      cachePolicy="memory-disk"
    />
  ) : (
    <View
      style={[
        styles.circle,
        {
          width: sz.box,
          height: sz.box,
          borderRadius: sz.box / 2,
          backgroundColor: swatch.background,
        },
      ]}
    >
      {kind === "supplier" ? (
        <Ionicons name="cube-outline" size={sz.icon} color={swatch.foreground} />
      ) : (
        <Text
          style={[
            styles.letter,
            { color: swatch.foreground, fontSize: sz.font, lineHeight: sz.font + 2 },
          ]}
        >
          {initialFromName(name)}
        </Text>
      )}
    </View>
  );

  if (!interactive) {
    return <View style={style}>{body}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="imagebutton"
      accessibilityLabel={name ?? undefined}
      style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }, style]}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: "center", justifyContent: "center" },
  letter: { fontWeight: "900", includeFontPadding: false },
  image: { backgroundColor: "rgba(15, 23, 42, 0.08)" },
});
