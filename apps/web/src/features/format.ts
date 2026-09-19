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

// ------------------------------------------------------------------ calendar days

function utc(date: string): Date {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d));
}

/** "2026-10-05" moved by whole days. Works on the calendar, so months and years roll over. */
export function addDays(date: string, days: number): string {
  const d = utc(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Today as "YYYY-MM-DD" on this computer's clock. */
export function today(now: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

/** The Monday of the week that holds this day. */
export function startOfWeek(date: string): string {
  const weekday = (utc(date).getUTCDay() + 6) % 7; // Monday is 0
  return addDays(date, -weekday);
}

/** "Mon 5 Oct" */
export function formatDayShort(date: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(utc(date));
}

/** "Monday 5 October 2026" */
export function formatDayLong(date: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(utc(date));
}

/** "5 Oct - 11 Oct 2026" for the week that starts on `monday`. */
export function formatWeek(monday: string): string {
  const fmt = (d: string, year: boolean) =>
    new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: year ? "numeric" : undefined,
      timeZone: "UTC",
    }).format(utc(d));
  return `${fmt(monday, false)} - ${fmt(addDays(monday, 6), true)}`;
}
