import { LIMITS } from "@lms/shared";
import { nowIso } from "../lib/time";

export interface LessonRow {
  id: string;
  tenant_id: string;
  course_id: string;
  course_name: string;
  series_id: string | null;
  title: string;
  starts_at: string;
  ends_at: string;
  place: string;
  online_url: string | null;
  status: "scheduled" | "held" | "cancelled";
  version: number;
}

/** Fixed text, used in every lesson query. Nothing from a request can reach it. */
const COLUMNS = `l.id, l.tenant_id, l.course_id, c.name AS course_name, l.series_id, l.title, l.starts_at,
  l.ends_at, l.place, l.online_url, l.status, l.version
  FROM lessons l JOIN courses c ON c.id = l.course_id AND c.tenant_id = l.tenant_id`;

export const tenantTimezone = async (db: D1Database, tenantId: string): Promise<string> =>
  (await db.prepare("SELECT timezone FROM tenants WHERE id = ?").bind(tenantId).first<{ timezone: string }>())
    ?.timezone ?? "Asia/Ho_Chi_Minh";

/** Every lesson query takes the tenant id, so another teacher's lesson is never returned. */
export const findLesson = (db: D1Database, tenantId: string, id: string) =>
  db.prepare(`SELECT ${COLUMNS} WHERE l.tenant_id = ? AND l.id = ?`).bind(tenantId, id).first<LessonRow>();

export async function lessonsOfCourse(db: D1Database, tenantId: string, courseId: string) {
  const res = await db
    .prepare(`SELECT ${COLUMNS} WHERE l.tenant_id = ? AND l.course_id = ? ORDER BY l.starts_at, l.id`)
    .bind(tenantId, courseId)
    .all<LessonRow>();
  return res.results;
}

/** Lessons that start in [fromIso, toIso), across all courses of the tenant. */
export async function lessonsBetween(db: D1Database, tenantId: string, fromIso: string, toIso: string) {
  const res = await db
    .prepare(
      `SELECT ${COLUMNS} WHERE l.tenant_id = ? AND l.starts_at >= ? AND l.starts_at < ?
       ORDER BY l.starts_at, l.id LIMIT 500`,
    )
    .bind(tenantId, fromIso, toIso)
    .all<LessonRow>();
  return res.results;
}

/** Lessons made in one go, from this moment on, that can still be changed. */
export async function seriesFrom(db: D1Database, tenantId: string, seriesId: string, fromStartsAt: string) {
  const res = await db
    .prepare(
      `SELECT ${COLUMNS} WHERE l.tenant_id = ? AND l.series_id = ? AND l.starts_at >= ? AND l.status = 'scheduled'
       ORDER BY l.starts_at, l.id`,
    )
    .bind(tenantId, seriesId, fromStartsAt)
    .all<LessonRow>();
  return res.results;
}

/** These lessons, in time order. The ids travel as one JSON list, so the number of lessons does not matter. */
export async function lessonsByIds(db: D1Database, tenantId: string, ids: string[]) {
  const res = await db
    .prepare(
      `SELECT ${COLUMNS} WHERE l.tenant_id = ? AND l.id IN (SELECT value FROM json_each(?))
       ORDER BY l.starts_at, l.id`,
    )
    .bind(tenantId, JSON.stringify(ids))
    .all<LessonRow>();
  return res.results;
}

/**
 * Makes all the lessons in ONE statement (so it is all or nothing, and it counts as one query
 * on the Free plan). It also checks, at the moment it runs, that the course belongs to this tenant,
 * is not archived, and would not go over the lesson limit. `meta.changes` is 0 when a check fails.
 */
export const insertLessonsStatement = (
  db: D1Database,
  o: {
    tenantId: string;
    courseId: string;
    seriesId: string | null;
    title: string;
    place: string;
    onlineUrl: string | null;
    lessons: { id: string; startsAt: string; endsAt: string }[];
  },
): D1PreparedStatement =>
  db
    .prepare(
      `INSERT INTO lessons (id, tenant_id, course_id, series_id, title, starts_at, ends_at, place, online_url, created_at, updated_at)
       SELECT json_extract(j.value, '$.id'), c.tenant_id, c.id, ?3, ?4, json_extract(j.value, '$.startsAt'),
         json_extract(j.value, '$.endsAt'), ?5, ?6, ?7, ?7
       FROM courses c, json_each(?1) j
       WHERE c.tenant_id = ?2 AND c.id = ?8 AND c.status != 'archived'
         AND (SELECT COUNT(*) FROM lessons x WHERE x.course_id = c.id) + json_array_length(?1) <= ?9`,
    )
    .bind(
      JSON.stringify(o.lessons),
      o.tenantId,
      o.seriesId,
      o.title,
      o.place,
      o.onlineUrl,
      nowIso(),
      o.courseId,
      LIMITS.maxLessonsPerCourse,
    );

/**
 * Changes these lessons (each with its own new time) in ONE statement. Only lessons that are still
 * "scheduled" change. The person must have been looking at the current version of `targetId`; if
 * that lesson was saved by someone else meanwhile, nothing changes at all. `meta.changes` is how many changed.
 */
export const updateLessonsStatement = (
  db: D1Database,
  o: {
    tenantId: string;
    targetId: string;
    version: number;
    title: string;
    place: string;
    onlineUrl: string | null;
    lessons: { id: string; startsAt: string; endsAt: string }[];
  },
): D1PreparedStatement =>
  db
    .prepare(
      `UPDATE lessons SET title = ?1, place = ?2, online_url = ?3, starts_at = j.starts_at, ends_at = j.ends_at,
         version = lessons.version + 1, updated_at = ?4
       FROM (SELECT json_extract(value, '$.id') AS id, json_extract(value, '$.startsAt') AS starts_at,
               json_extract(value, '$.endsAt') AS ends_at FROM json_each(?5)) j
       WHERE lessons.id = j.id AND lessons.tenant_id = ?6 AND lessons.status = 'scheduled'
         AND (SELECT version FROM lessons t WHERE t.id = ?7 AND t.tenant_id = ?6 AND t.status = 'scheduled') = ?8`,
    )
    .bind(
      o.title,
      o.place,
      o.onlineUrl,
      nowIso(),
      JSON.stringify(o.lessons),
      o.tenantId,
      o.targetId,
      o.version,
    );

/** Cancels one lesson, or this one and the later ones of its series. Only "scheduled" lessons change. */
export const cancelLessonsStatement = (
  db: D1Database,
  o: { tenantId: string; id: string; seriesId: string | null; startsAt: string; following: boolean },
): D1PreparedStatement =>
  db
    .prepare(
      `UPDATE lessons SET status = 'cancelled', version = version + 1, updated_at = ?1
       WHERE tenant_id = ?2 AND status = 'scheduled'
         AND (id = ?3 OR (?4 = 1 AND series_id = ?5 AND starts_at >= ?6))`,
    )
    .bind(nowIso(), o.tenantId, o.id, o.following ? 1 : 0, o.seriesId, o.startsAt);

export const restoreLessonStatement = (db: D1Database, tenantId: string, id: string): D1PreparedStatement =>
  db
    .prepare(
      `UPDATE lessons SET status = 'scheduled', version = version + 1, updated_at = ?
       WHERE tenant_id = ? AND id = ? AND status = 'cancelled'`,
    )
    .bind(nowIso(), tenantId, id);
