/** Money is a whole number of VND. Shown with thousands separators and no decimals. */
export function formatVnd(amount: number): string {
  return `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(amount)} VND`;
}

/** "2026-10-01" shown as a date. Uses the date as written, with no time zone shift. */
export function formatDay(isoDate: string | null): string {
  if (!isoDate) return "-";
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
}
