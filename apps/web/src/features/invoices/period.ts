import { today } from "@/features/format";

/** The month of today as "2026-09", on this computer's clock. */
export const currentPeriod = (now: Date = new Date()): string => today(now).slice(0, 7);

/** "2026-09" moved by whole months. The year rolls over. */
export function shiftPeriod(period: string, months: number): string {
  const [y, m] = period.split("-").map(Number) as [number, number];
  return new Date(Date.UTC(y, m - 1 + months, 1)).toISOString().slice(0, 7);
}

/** "September 2026" */
export const periodLabel = (period: string): string =>
  new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${period}-01T00:00:00Z`),
  );

/** "2026-09" as "09/2026". */
export const periodShort = (period: string): string => {
  const [y, m] = period.split("-");
  return `${m}/${y}`;
};
