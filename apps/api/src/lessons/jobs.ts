import { LIMITS } from "@lms/shared";
import type { Env } from "../env";
import { addDays, utcToLocal, localToUtc } from "../lib/zone";
import { insertLessonsStatement, seriesToExtend } from "../repos/lessons";
import { uuidv7 } from "../lib/id";
import { repeatDays } from "./repeat";

/** At most this many repeats are looked after in one run (the job runs every hour, so the rest wait for the next run). */
const PER_RUN = 20;

/**
 * A repeat with no end date keeps its lessons made `openSeriesWeeks` weeks ahead. Once an hour, each one of them whose
 * next lesson is now inside that time gets its new lessons. They copy the last lesson of the series, at the same clock
 * time and on the same weekday. Days that are already past are not made.
 */
export async function extendOpenSeries(env: Env, now: Date = new Date()): Promise<number> {
  const db = env.DB;
  const horizon = new Date(now.getTime() + LIMITS.openSeriesWeeks * 7 * 86_400_000).toISOString();
  const rows = await seriesToExtend(db, horizon, PER_RUN);
  const statements: D1PreparedStatement[] = [];
  let made = 0;
  for (const r of rows) {
    const last = utcToLocal(r.starts_at, r.timezone);
    const step = 7 * r.every_weeks;
    const today = utcToLocal(now.toISOString(), r.timezone).date;
    let first = addDays(last.date, step);
    for (let guard = 0; first < today && guard < 1000; guard++) first = addDays(first, step);
    const days = repeatDays({
      date: first,
      every: r.every_weeks as 1 | 2,
      until: utcToLocal(horizon, r.timezone).date,
      today,
    });
    if (!days || days.length === 0) continue;
    const length = new Date(r.ends_at).getTime() - new Date(r.starts_at).getTime();
    const lessons = days.map((day) => {
      const startsAt = localToUtc(day, last.time, r.timezone);
      return {
        id: uuidv7(),
        startsAt,
        endsAt: new Date(new Date(startsAt).getTime() + length).toISOString(),
      };
    });
    made += lessons.length;
    statements.push(
      insertLessonsStatement(db, {
        tenantId: r.tenant_id,
        courseId: r.course_id,
        seriesId: r.series_id,
        title: r.title,
        place: r.place,
        onlineUrl: r.online_url,
        lessons,
      }),
    );
  }
  if (statements.length > 0) await db.batch(statements);
  return made;
}
