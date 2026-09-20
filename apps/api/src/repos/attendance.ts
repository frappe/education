import type { AttendanceStatus } from "@lms/shared";
import { nowIso } from "../lib/time";

export interface SheetRow {
  student_id: string;
  name: string;
  saved_status: AttendanceStatus | null;
  in_course: number;
  /** The student joined the course after this lesson was over. */
  joined_after: number;
}

/**
 * The students a lesson's attendance is about:
 *  - everyone in the course who had not left before the lesson started, and is not archived;
 *  - plus anyone who already has a saved mark for it, so a mark is never hidden.
 * `joined_after` tells the caller who joined only after the lesson was over (a teacher who adds an
 * old lesson and the students later). Those start as "absent", so "everyone starts as attended"
 * cannot bill a lesson the student could not have been at.
 */
export async function sheetRows(db: D1Database, tenantId: string, lessonId: string): Promise<SheetRow[]> {
  const res = await db
    .prepare(
      `SELECT s.id AS student_id, s.name, a.status AS saved_status,
         (e.student_id IS NOT NULL AND s.status != 'archived') AS in_course,
         (e.enrolled_at > l.ends_at) AS joined_after
       FROM lessons l
       JOIN students s ON s.tenant_id = l.tenant_id
       LEFT JOIN enrollments e ON e.tenant_id = l.tenant_id AND e.course_id = l.course_id AND e.student_id = s.id
         AND e.status != 'pending' AND (e.ended_at IS NULL OR e.ended_at >= l.starts_at)
       LEFT JOIN attendance a ON a.lesson_id = l.id AND a.student_id = s.id
       WHERE l.tenant_id = ?1 AND l.id = ?2 AND ((e.student_id IS NOT NULL AND s.status != 'archived') OR a.id IS NOT NULL)
       ORDER BY s.name COLLATE NOCASE, s.id`,
    )
    .bind(tenantId, lessonId)
    .all<SheetRow>();
  return res.results;
}

/**
 * Saves every mark in ONE statement. A mark that is already saved with the same status is left
 * alone (`meta.changes` counts only new and changed marks). Nothing is saved if the lesson is
 * cancelled or has not started yet, checked at the moment it runs.
 */
export const saveMarksStatement = (
  db: D1Database,
  o: {
    tenantId: string;
    lessonId: string;
    userId: string;
    marks: { id: string; studentId: string; status: AttendanceStatus }[];
  },
): D1PreparedStatement =>
  db
    .prepare(
      `INSERT INTO attendance (id, tenant_id, lesson_id, student_id, status, marked_at, marked_by)
       SELECT json_extract(j.value, '$.id'), l.tenant_id, l.id, json_extract(j.value, '$.studentId'),
         json_extract(j.value, '$.status'), ?3, ?4
       FROM lessons l, json_each(?1) j
       WHERE l.tenant_id = ?2 AND l.id = ?5 AND l.status != 'cancelled' AND l.starts_at <= ?3
       ON CONFLICT (lesson_id, student_id) DO UPDATE SET
         status = excluded.status, marked_at = excluded.marked_at, marked_by = excluded.marked_by
       WHERE attendance.status != excluded.status`,
    )
    .bind(JSON.stringify(o.marks), o.tenantId, nowIso(), o.userId, o.lessonId);

/** Taking attendance means the lesson took place. */
export const markLessonHeldStatement = (
  db: D1Database,
  tenantId: string,
  lessonId: string,
): D1PreparedStatement =>
  db
    .prepare(
      `UPDATE lessons SET status = 'held', version = version + 1, updated_at = ?1
       WHERE tenant_id = ?2 AND id = ?3 AND status = 'scheduled' AND starts_at <= ?1`,
    )
    .bind(nowIso(), tenantId, lessonId);

/** The totals of a student, and one page of the marks, newest first. */
export async function attendanceOfStudent(
  db: D1Database,
  tenantId: string,
  studentId: string,
  limit: number,
  offset: number,
) {
  const counts = await db
    .prepare(
      `SELECT COALESCE(SUM(status = 'attended'), 0) AS attended, COALESCE(SUM(status = 'absent'), 0) AS absent
       FROM attendance WHERE tenant_id = ? AND student_id = ?`,
    )
    .bind(tenantId, studentId)
    .first<{ attended: number; absent: number }>();
  const recent = await db
    .prepare(
      `SELECT l.id AS lesson_id, c.name AS course_name, l.title, l.starts_at, a.status
       FROM attendance a JOIN lessons l ON l.id = a.lesson_id AND l.tenant_id = a.tenant_id
         JOIN courses c ON c.id = l.course_id AND c.tenant_id = l.tenant_id
       WHERE a.tenant_id = ? AND a.student_id = ?
       ORDER BY l.starts_at DESC, l.id LIMIT ? OFFSET ?`,
    )
    .bind(tenantId, studentId, limit, offset)
    .all<{
      lesson_id: string;
      course_name: string;
      title: string;
      starts_at: string;
      status: AttendanceStatus;
    }>();
  return { attended: counts?.attended ?? 0, absent: counts?.absent ?? 0, recent: recent.results };
}
