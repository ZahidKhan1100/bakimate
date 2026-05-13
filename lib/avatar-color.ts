/**
 * Deterministic name -> color for letter-fallback avatars.
 * Low-literacy mode leans on color + shape recognition, so the same name
 * must always produce the same swatch across screens.
 */

const PALETTE: ReadonlyArray<{ background: string; foreground: string }> = [
  { background: "#0EA5E9", foreground: "#FFFFFF" },
  { background: "#6366F1", foreground: "#FFFFFF" },
  { background: "#A855F7", foreground: "#FFFFFF" },
  { background: "#EC4899", foreground: "#FFFFFF" },
  { background: "#F97316", foreground: "#FFFFFF" },
  { background: "#F59E0B", foreground: "#1F2937" },
  { background: "#10B981", foreground: "#FFFFFF" },
  { background: "#14B8A6", foreground: "#FFFFFF" },
  { background: "#0D9488", foreground: "#FFFFFF" },
  { background: "#22C55E", foreground: "#0F172A" },
  { background: "#EF4444", foreground: "#FFFFFF" },
  { background: "#8B5CF6", foreground: "#FFFFFF" },
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export type AvatarSwatch = { background: string; foreground: string };

export function nameToSwatch(name: string | null | undefined): AvatarSwatch {
  const key = (name ?? "").trim().toLowerCase();
  if (!key) return PALETTE[0];
  const idx = hashString(key) % PALETTE.length;
  return PALETTE[idx];
}

/** First grapheme of name, uppercased. Returns "?" for empty/whitespace input. */
export function initialFromName(name: string | null | undefined): string {
  const t = (name ?? "").trim();
  if (!t) return "?";
  // Array.from handles surrogate pairs and most combining marks correctly.
  return Array.from(t)[0]!.toUpperCase();
}
