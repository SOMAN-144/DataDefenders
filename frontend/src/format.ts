const IN = new Intl.NumberFormat("en-IN");
export const UNAVAILABLE = "Data unavailable";

export function num(value: number | null | undefined): string {
  return value == null ? UNAVAILABLE : IN.format(Math.round(value));
}

export function dec(value: number | null | undefined, digits = 1): string {
  if (value == null) return UNAVAILABLE;
  return new Intl.NumberFormat("en-IN", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
}

export function pct(value: number | null | undefined, digits = 1, signed = false): string {
  if (value == null) return UNAVAILABLE;
  const sign = signed && value > 0 ? "+" : "";
  return `${sign}${dec(value, digits)}%`;
}

/** Amount given in crore, e.g. ₹22,848 crore. */
export function crore(value: number | null | undefined, digits = 0): string {
  if (value == null) return UNAVAILABLE;
  return `₹${dec(value, digits)} crore`;
}

/** Whole rupees in Indian digit grouping. */
export function inr(value: number | null | undefined): string {
  return value == null ? UNAVAILABLE : `₹${IN.format(Math.round(value))}`;
}

/** Short axis labels using Indian units. */
export function compact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1e7) return `${+(value / 1e7).toFixed(1)} Cr`;
  if (abs >= 1e5) return `${+(value / 1e5).toFixed(1)} L`;
  if (abs >= 1e3) return `${+(value / 1e3).toFixed(0)}K`;
  return `${value}`;
}
