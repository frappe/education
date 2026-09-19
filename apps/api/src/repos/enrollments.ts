import type { EnrollmentInfo, EnrollmentStatus, StudentCourseInfo } from "@lms/shared";
import { nowIso } from "../lib/time";
import { ACTIVE_SEATS } from "./courses";
import { placeholders } from "./sql";

/**
 * Adds a student to a course, in ONE statement that also checks:
 *  - the course and the student both belong to this tenant,
 *  - neither is archived,
 *  - there is still a free seat (counted at the moment of the insert).
 * Two requests at the same time cannot both take the last seat, because each statement
 * counts again when it runs. If the student joined before and left, the same row is opened again.
 * `meta.changes` is 1 when the student joined, and 0 when any check failed.
 */
export const enrollStatement = (
  db: D1Database,
  o: { id: string; tenantId: string; courseId: string; studentId: string; customPrice: number | null },
): D1PreparedStatement => {
  const now = nowIso();
  return db
    .prepare(
      `INSERT INTO enrollments (id, tenant_id, course_id, student_id, status, custom_price, enrolled_at, created_at, updated_at)
       SELECT ?1, c.tenant_id, c.id, s.id, 'active', ?2, ?3, ?3, ?3
       FROM courses c JOIN students s ON s.tenant_id = c.tenant_id
       WHERE c.tenant_id = ?4 AND c.id = ?5 AND s.id = ?6 AND c.status != 'archived' AND s.status != 'archived'
         AND (c.max_students IS NULL OR (${ACTIVE_SEATS}) < c.max_students)
       ON CONFLICT (course_id, student_id) DO UPDATE SET
         status = 'active', custom_price = excluded.custom_price, enrolled_at = excluded.enrolled_at,
         ended_at = NULL, version = enrollments.version + 1, updated_at = excluded.updated_at
       WHERE enrollments.status != 'active'`,
    )
    .bind(o.id, o.customPrice, now, o.tenantId, o.courseId, o.studentId);
};

interface RosterRow {
  student_id: string;
  student_name: string;
  student_email: string;
  student_archived: number;
  status: EnrollmentStatus;
  custom_price: number | null;
  enrolled_at: string;
  ended_at: string | null;
}

export async function roster(db: D1Database, tenantId: string, courseId: string): Promise<EnrollmentInfo[]> {
  const res = await db
    .prepare(
      `SELECT e.student_id, s.name AS student_name, s.email AS student_email, (s.status = 'archived') AS student_archived,
         e.status, e.custom_price, e.enrolled_at, e.ended_at
       FROM enrollments e JOIN students s ON s.id = e.student_id AND s.tenant_id = e.tenant_id
       WHERE e.tenant_id = ? AND e.course_id = ?
       ORDER BY (e.status = 'active') DESC, s.name COLLATE NOCASE, e.student_id`,
    )
    .bind(tenantId, courseId)
    .all<RosterRow>();
  return res.results.map((r) => ({
    studentId: r.student_id,
    studentName: r.student_name,
    studentEmail: r.student_email,
    studentArchived: r.student_archived === 1,
    status: r.status,
    customPrice: r.custom_price,
    enrolledAt: r.enrolled_at,
    endedAt: r.ended_at,
  }));
}

export async function coursesOfStudent(
  db: D1Database,
  tenantId: string,
  studentId: string,
): Promise<StudentCourseInfo[]> {
  const res = await db
    .prepare(
      `SELECT c.id AS course_id, c.name AS course_name, c.status AS course_status, c.price_per_lesson,
         e.status, e.custom_price, e.enrolled_at
       FROM enrollments e JOIN courses c ON c.id = e.course_id AND c.tenant_id = e.tenant_id
       WHERE e.tenant_id = ? AND e.student_id = ?
       ORDER BY (e.status = 'active') DESC, c.name COLLATE NOCASE, c.id`,
    )
    .bind(tenantId, studentId)
    .all<{
      course_id: string;
      course_name: string;
      course_status: "draft" | "active" | "archived";
      price_per_lesson: number;
      status: EnrollmentStatus;
      custom_price: number | null;
      enrolled_at: string;
    }>();
  return res.results.map((r) => ({
    courseId: r.course_id,
    courseName: r.course_name,
    courseStatus: r.course_status,
    status: r.status,
    customPrice: r.custom_price,
    pricePerLesson: r.price_per_lesson,
    enrolledAt: r.enrolled_at,
  }));
}

/** Students of this tenant among the given ids, with their state. Others simply do not come back. */
export async function studentsAmong(
  db: D1Database,
  tenantId: string,
  ids: string[],
): Promise<Map<string, { archived: boolean }>> {
  const found = new Map<string, { archived: boolean }>();
  const res = await db
    .prepare(`SELECT id, status FROM students WHERE tenant_id = ? AND id IN (${placeholders(ids.length)})`)
    .bind(tenantId, ...ids)
    .all<{ id: string; status: string }>();
  for (const r of res.results) found.set(r.id, { archived: r.status === "archived" });
  return found;
}

export async function statusesAmong(
  db: D1Database,
  tenantId: string,
  courseId: string,
  ids: string[],
): Promise<Map<string, EnrollmentStatus>> {
  const found = new Map<string, EnrollmentStatus>();
  const res = await db
    .prepare(
      `SELECT student_id, status FROM enrollments WHERE tenant_id = ? AND course_id = ? AND student_id IN (${placeholders(ids.length)})`,
    )
    .bind(tenantId, courseId, ...ids)
    .all<{ student_id: string; status: EnrollmentStatus }>();
  for (const r of res.results) found.set(r.student_id, r.status);
  return found;
}

export const findEnrollmentStatus = (db: D1Database, tenantId: string, courseId: string, studentId: string) =>
  db
    .prepare("SELECT status FROM enrollments WHERE tenant_id = ? AND course_id = ? AND student_id = ?")
    .bind(tenantId, courseId, studentId)
    .first<{ status: EnrollmentStatus }>();

/**
 * Changes the status or the price of one enrollment. Going back to "active" needs a free seat,
 * checked inside the same statement. `meta.changes` is 0 when the row is missing or the course is full.
 */
export const updateEnrollmentStatement = (
  db: D1Database,
  o: {
    tenantId: string;
    courseId: string;
    studentId: string;
    status: "active" | "completed" | "dropped";
    customPrice: number | null;
  },
): D1PreparedStatement =>
  db
    .prepare(
      `UPDATE enrollments SET
         status = ?1, custom_price = ?2,
         ended_at = CASE WHEN ?1 = 'active' THEN NULL ELSE COALESCE(ended_at, ?3) END,
         enrolled_at = CASE WHEN ?1 = 'active' AND status != 'active' THEN ?3 ELSE enrolled_at END,
         version = version + 1, updated_at = ?3
       WHERE tenant_id = ?4 AND course_id = ?5 AND student_id = ?6
         AND (?1 != 'active' OR status = 'active' OR EXISTS (
           SELECT 1 FROM courses c WHERE c.id = enrollments.course_id
             AND (c.max_students IS NULL OR (${ACTIVE_SEATS}) < c.max_students)))`,
    )
    .bind(o.status, o.customPrice, nowIso(), o.tenantId, o.courseId, o.studentId);
