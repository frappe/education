import type { CourseInfo } from "@lms/shared";
import { nowIso } from "../lib/time";

export interface CourseRow {
  id: string;
  tenant_id: string;
  name: string;
  description: string;
  price_per_lesson: number;
  start_date: string | null;
  end_date: string | null;
  max_students: number | null;
  enrolled_count: number;
  status: "draft" | "active" | "archived";
  version: number;
  created_at: string;
}

/**
 * Students who hold a seat: joined (active) and not archived. Written once and used in every
 * place that counts seats, so the number is always worked out the same way. It is a fixed
 * piece of SQL, and nothing from a request can reach it.
 * Expects the course to be called "c" in the query that uses it.
 */
export const ACTIVE_SEATS = `SELECT COUNT(*) FROM enrollments e JOIN students es ON es.id = e.student_id
  WHERE e.course_id = c.id AND e.status = 'active' AND es.status != 'archived'`;

const COLUMNS = `id, tenant_id, name, description, price_per_lesson, start_date, end_date, max_students,
  (${ACTIVE_SEATS}) AS enrolled_count, status, version, created_at`;

export const toCourseInfo = (r: CourseRow): CourseInfo => ({
  id: r.id,
  name: r.name,
  description: r.description,
  pricePerLesson: r.price_per_lesson,
  startDate: r.start_date,
  endDate: r.end_date,
  maxStudents: r.max_students,
  enrolledCount: r.enrolled_count,
  status: r.status,
  version: r.version,
  createdAt: r.created_at,
});

/** Every course query takes the tenant id, so another teacher's course is never returned. */
export const findCourse = (db: D1Database, tenantId: string, id: string) =>
  db
    .prepare(`SELECT ${COLUMNS} FROM courses c WHERE tenant_id = ? AND id = ?`)
    .bind(tenantId, id)
    .first<CourseRow>();

export async function listCourses(
  db: D1Database,
  tenantId: string,
  includeArchived: boolean,
): Promise<CourseRow[]> {
  const res = await db
    .prepare(
      `SELECT ${COLUMNS} FROM courses c WHERE tenant_id = ? AND (? = 1 OR status != 'archived')
       ORDER BY created_at DESC, id DESC`,
    )
    .bind(tenantId, includeArchived ? 1 : 0)
    .all<CourseRow>();
  return res.results;
}

export const insertCourse = (
  db: D1Database,
  c: {
    id: string;
    tenantId: string;
    name: string;
    description: string;
    pricePerLesson: number;
    startDate: string | null;
    endDate: string | null;
    maxStudents: number | null;
    status: "draft" | "active";
  },
): D1PreparedStatement => {
  const now = nowIso();
  return db
    .prepare(
      `INSERT INTO courses (id, tenant_id, name, description, price_per_lesson, start_date, end_date, max_students, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      c.id,
      c.tenantId,
      c.name,
      c.description,
      c.pricePerLesson,
      c.startDate,
      c.endDate,
      c.maxStudents,
      c.status,
      now,
      now,
    );
};

/**
 * Saves changes only if nobody changed the course since the person opened it (same version).
 * The caller checks `meta.changes`: 0 means "someone else saved first".
 */
export const updateCourse = (
  db: D1Database,
  tenantId: string,
  id: string,
  version: number,
  c: {
    name: string;
    description: string;
    pricePerLesson: number;
    startDate: string | null;
    endDate: string | null;
    maxStudents: number | null;
    status?: "draft" | "active";
  },
): D1PreparedStatement =>
  db
    .prepare(
      `UPDATE courses SET name = ?, description = ?, price_per_lesson = ?, start_date = ?, end_date = ?,
         max_students = ?, status = COALESCE(?, status), version = version + 1, updated_at = ?
       WHERE tenant_id = ? AND id = ? AND version = ? AND status != 'archived'`,
    )
    .bind(
      c.name,
      c.description,
      c.pricePerLesson,
      c.startDate,
      c.endDate,
      c.maxStudents,
      c.status ?? null,
      nowIso(),
      tenantId,
      id,
      version,
    );

export const archiveCourse = (db: D1Database, tenantId: string, id: string): D1PreparedStatement =>
  db
    .prepare(
      "UPDATE courses SET status = 'archived', version = version + 1, updated_at = ? WHERE tenant_id = ? AND id = ? AND status != 'archived'",
    )
    .bind(nowIso(), tenantId, id);

/** An archived course comes back as a draft, so the teacher chooses when it starts again. */
export const restoreCourse = (db: D1Database, tenantId: string, id: string): D1PreparedStatement =>
  db
    .prepare(
      "UPDATE courses SET status = 'draft', version = version + 1, updated_at = ? WHERE tenant_id = ? AND id = ? AND status = 'archived'",
    )
    .bind(nowIso(), tenantId, id);
