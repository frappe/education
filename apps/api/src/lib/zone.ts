/**
 * Times are stored in UTC. People type and read them in the teacher's time zone (default
 * Asia/Ho_Chi_Minh). A weekly lesson keeps the same clock time every week, also across a change
 * to summer time, so each week is worked out from the local date, never by adding 7 x 24 hours.
 */

const formats = new Map<string, Intl.DateTimeFormat>();
function formatter(zone: string): Intl.DateTimeFormat {
  let f = formats.get(zone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    formats.set(zone, f);
  }
  return f;
}

/** The wall clock in `zone` at this moment. */
function wallClock(ms: number, zone: string) {
  const p: Record<string, number> = {};
  for (const part of formatter(zone).formatToParts(new Date(ms))) {
    if (part.type !== "literal") p[part.type] = Number(part.value);
  }
  return p as { year: number; month: number; day: number; hour: number; minute: number; second: number };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** How far the clock in `zone` is ahead of UTC at this moment. */
function offsetMs(ms: number, zone: string): number {
  const w = wallClock(ms, zone);
  const asUtc = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second);
  return asUtc - Math.floor(ms / 1000) * 1000;
}

/** "2026-10-05" and "18:30" as they are on the clock in `zone`. */
export function utcToLocal(iso: string, zone: string): { date: string; time: string } {
  const w = wallClock(new Date(iso).getTime(), zone);
  return { date: `${w.year}-${pad(w.month)}-${pad(w.day)}`, time: `${pad(w.hour)}:${pad(w.minute)}` };
}

/**
 * The UTC moment when the clock in `zone` shows this date and time. If the clock skips this time
 * (spring forward) the moment just after is used; if it shows it twice (fall back) the first one.
 */
export function localToUtc(date: string, time: string, zone: string): string {
  const [y, mo, d] = date.split("-").map(Number) as [number, number, number];
  const [h, mi] = time.split(":").map(Number) as [number, number];
  const wall = Date.UTC(y, mo - 1, d, h, mi);
  // The clock in `zone` is either "before" or "after" a change on this day. Try both offsets and keep
  // the moments where the clock really shows this time.
  const before = offsetMs(wall - 86_400_000, zone);
  const after = offsetMs(wall + 86_400_000, zone);
  const fits = [wall - before, wall - after]
    .filter((ms) => offsetMs(ms, zone) === wall - ms)
    .sort((a, b) => a - b);
  // Two fits: the time happens twice (fall back), take the first. None: the time is skipped (spring
  // forward), so use the offset from before the change, which lands just after the gap.
  return new Date(fits[0] ?? wall - before).toISOString();
}

/** A calendar date moved by whole days ("2026-10-05" + 7 = "2026-10-12"). */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Whole days from one calendar date to another. */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

export const isValidZone = (zone: string): boolean => {
  try {
    formatter(zone);
    return true;
  } catch {
    return false;
  }
};
