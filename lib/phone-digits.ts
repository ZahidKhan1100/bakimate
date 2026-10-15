/** Digits-only form for comparing phone numbers (add/edit duplicate checks). */
export function phoneDigitsOnly(raw: string | null | undefined): string {
  return (raw ?? "").replace(/\D/g, "");
}
