/**
 * Match spoken / parsed product text to a shop quick-item label.
 */
export function resolveVoiceQuickItem(params: {
  itemKey: string | null;
  note: string | null;
  transcript: string;
  quickItems: string[];
}): string | null {
  const { itemKey, note, transcript, quickItems } = params;
  if (quickItems.length === 0) {
    return null;
  }

  if (itemKey) {
    const exact = quickItems.find((l) => l === itemKey);
    if (exact) {
      return exact;
    }
    const ci = quickItems.find((l) => l.toLowerCase() === itemKey.toLowerCase());
    if (ci) {
      return ci;
    }
  }

  const hay = `${note ?? ""} ${transcript}`.toLowerCase();
  for (const label of quickItems) {
    const ll = label.toLowerCase();
    if (ll && hay.includes(ll)) {
      return label;
    }
  }

  return null;
}
