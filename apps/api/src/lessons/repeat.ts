import { LIMITS, type Repeat } from "@lms/shared";
import { addDays } from "../lib/zone";

/** Every how many weeks a lesson repeats. 0: it does not. */
export const everyWeeks = (repeat: Repeat): 0 | 1 | 2 =>
  repeat === "weekly" ? 1 : repeat === "every_2_weeks" ? 2 : 0;

/**
 * The days of the lessons of one repeat, in the teacher's time zone, all on the weekday of `date`.
 * With an end day, up to it. Without one, up to `openSeriesWeeks` weeks ahead of today (or of the first lesson, when
 * that is later). Returns null when that would be more than `maxLessonsAtOnce` lessons.
 */
export function repeatDays(o: {
  date: string;
  every: 0 | 1 | 2;
  until: string | null;
  today: string;
}): string[] | null {
  if (o.every === 0) return [o.date];
  const last = o.until ?? addDays(o.date > o.today ? o.date : o.today, 7 * LIMITS.openSeriesWeeks);
  const days: string[] = [];
  for (let d = o.date; d <= last; d = addDays(d, 7 * o.every)) {
    if (days.length >= LIMITS.maxLessonsAtOnce) return null;
    days.push(d);
  }
  return days;
}
