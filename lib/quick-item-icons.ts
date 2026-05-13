import type { ComponentProps } from "react";
import type { Ionicons } from "@expo/vector-icons";

type IoniconName = ComponentProps<typeof Ionicons>["name"];

/**
 * Quick-item label -> pictogram. Matches the EN + MS labels that the shop
 * profile editor seeds, and falls back to a neutral "?" icon so user-added
 * custom items still render.
 */
const ICON_MAP: Record<string, IoniconName> = {
  phone: "phone-portrait-outline",
  telefon: "phone-portrait-outline",
  fridge: "snow-outline",
  peti: "snow-outline",
  "peti sejuk": "snow-outline",
  grocery: "basket-outline",
  groceries: "basket-outline",
  barang: "basket-outline",
  "barang dapur": "basket-outline",
  accessory: "watch-outline",
  aksesori: "watch-outline",
  food: "fast-food-outline",
  makanan: "fast-food-outline",
  drink: "cafe-outline",
  drinks: "cafe-outline",
  minuman: "cafe-outline",
  rice: "leaf-outline",
  beras: "leaf-outline",
  cigarette: "flame-outline",
  rokok: "flame-outline",
  clothing: "shirt-outline",
  pakaian: "shirt-outline",
  fuel: "car-outline",
  petrol: "car-outline",
  minyak: "car-outline",
  service: "construct-outline",
  servis: "construct-outline",
  repair: "construct-outline",
  other: "help-circle-outline",
  lain: "help-circle-outline",
  "lain-lain": "help-circle-outline",
};

export function iconForQuickItem(label: string | null | undefined): IoniconName {
  const key = (label ?? "").trim().toLowerCase();
  return ICON_MAP[key] ?? "pricetag-outline";
}
