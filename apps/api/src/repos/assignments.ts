import type { LinkInfo, QuestionInfo } from "@lms/shared";
import { nowIso } from "../lib/time";

export interface AssignmentRow {
  id: string;
  tenant_id: string;
  course_id: string;
  course_name: string;
  type: "multiple_choice" | "essay" | "speaking";
  title: string;
  instructions: string;
  questions: string;
  links: string;
  due_at: string | null;
  allow_late: number;
  max_score: number;
  target_mode: "all" | "selected";
  status: "draft" | "published" | "closed";
  version: number;
  targeted: number;
  handed_in: number;
  to_grade: number;
}

/**
 * Students the work is for: everyone in the course now (when it is for "all"), or the ones chosen.
 * Fixed text. Expects the assignment to be called "a" in the query that uses it.
 */
const TARGETED = `CASE a.target_mode
  WHEN 'all' THEN (SELECT COUNT(*) FROM enrollments e JOIN students s ON s.id = e.student_id
                   WHERE e.course_id = a.course_id AND e.status = 'active' AND s.status != 'archived')
  ELSE (SELECT COUNT(*) FROM assignment_targets t WHERE t.assignment_id = a.id) END`;

const COLUMNS = `a.id, a.tenant_id, a.course_id, c.name AS course_name, a.type, a.title, a.instructions,
  a.questions, a.links, a.due_at, a.allow_late, a.max_score, a.target_mode, a.status, a.version,
  (${TARGETED}) AS targeted,
  (SELECT COUNT(*) FROM submissions x WHERE x.assignment_id = a.id AND x.status IN ('submitted', 'graded', 'returned')) AS handed_in,
  (SELECT COUNT(*) FROM submissions x WHERE x.assignment_id = a.id AND x.status = 'submitted') AS to_grade
  FROM assignments a JOIN courses c ON c.id = a.course_id AND c.tenant_id = a.tenant_id AND a.deleted_at IS NULL`;

export const parseList = <T>(text: string): T[] => {
  try {
    const v: unknown = JSON.parse(text);
    return Array.isArray(v) ? (v as T[]) : [];
  } catch {
    return [];
  }
};
/** A JSON object of points by question id. A missing or broken one is empty. */
export const parsePoints = (text: string | null): Record<string, number> => {
  try {
    const v: unknown = JSON.parse(text ?? "{}");
    return v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, number>) : {};
  } catch {
    return {};
  }
};
/** The teacher's comment on each question (question id to text). Anything that is not text is left out. */
export const parseNotes = (text: string | null): Record<string, string> => {
  try {
    const v: unknown = JSON.parse(text ?? "{}");
    if (v === null || typeof v !== "object" || Array.isArray(v)) return {};
    return Object.fromEntries(Object.entries(v).filter(([, note]) => typeof note === "string")) as Record<
      string,
      string
    >;
  } catch {
    return {};
  }
};
export const questionsOf = (r: Pick<AssignmentRow, "questions">) => parseList<QuestionInfo>(r.questions);
export const linksOf = (r: Pick<AssignmentRow, "links">) => parseList<LinkInfo>(r.links);

/** Every assignment query takes the tenant id, so another teacher's assignment is never returned. */
export const findAssignment = (db: D1Database, tenantId: string, id: string) =>
  db
    .prepare(`SELECT ${COLUMNS} WHERE a.tenant_id = ? AND a.id = ?`)
    .bind(tenantId, id)
    .first<AssignmentRow>();

export async function assignmentsOfCourse(db: D1Database, tenantId: string, courseId: string) {
  const res = await db
    .prepare(
      `SELECT ${COLUMNS} WHERE a.tenant_id = ? AND a.course_id = ? ORDER BY a.created_at DESC, a.id DESC`,
    )
    .bind(tenantId, courseId)
    .all<AssignmentRow>();
  return res.results;
}

export async function targetIds(db: D1Database, tenantId: string, assignmentId: string): Promise<string[]> {
  const res = await db
    .prepare("SELECT student_id FROM assignment_targets WHERE tenant_id = ? AND assignment_id = ?")
    .bind(tenantId, assignmentId)
    .all<{ student_id: string }>();
  return res.results.map((r) => r.student_id);
}

/** Of these students, the ones who are in the course now and not archived (the only ones work can be given to). */
export async function enrolledAmong(db: D1Database, tenantId: string, courseId: string, ids: string[]) {
  const res = await db
    .prepare(
      `SELECT e.student_id FROM enrollments e JOIN students s ON s.id = e.student_id AND s.tenant_id = e.tenant_id
       WHERE e.tenant_id = ?1 AND e.course_id = ?2 AND e.status = 'active' AND s.status != 'archived'
         AND e.student_id IN (SELECT value FROM json_each(?3))`,
    )
    .bind(tenantId, courseId, JSON.stringify(ids))
    .all<{ student_id: string }>();
  return new Set(res.results.map((r) => r.student_id));
}

export interface AssignmentWrite {
  /** A summary derived from the questions. Nothing depends on it. */
  type: string;
  title: string;
  instructions: string;
  questions: QuestionInfo[];
  links: LinkInfo[];
  dueAt: string | null;
  allowLate: boolean;
  maxScore: number;
  targetMode: "all" | "selected";
}

/** Makes an assignment (as a draft) only if the course is in this tenant and not archived. */
export const insertAssignmentStatement = (
  db: D1Database,
  o: { id: string; tenantId: string; courseId: string } & AssignmentWrite,
): D1PreparedStatement => {
  const now = nowIso();
  return db
    .prepare(
      `INSERT INTO assignments (id, tenant_id, course_id, type, title, instructions, questions, links, due_at,
         allow_late, max_score, target_mode, created_at, updated_at)
       SELECT ?1, c.tenant_id, c.id, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?11 FROM courses c
       WHERE c.tenant_id = ?12 AND c.id = ?13 AND c.status != 'archived'`,
    )
    .bind(
      o.id,
      o.type,
      o.title,
      o.instructions,
      JSON.stringify(o.questions),
      JSON.stringify(o.links),
      o.dueAt,
      o.allowLate ? 1 : 0,
      o.maxScore,
      o.targetMode,
      now,
      o.tenantId,
      o.courseId,
    );
};

/** Chosen students for an assignment, in one statement. Runs only when the assignment is in this tenant. */
export const insertTargetsStatement = (
  db: D1Database,
  tenantId: string,
  assignmentId: string,
  ids: string[],
): D1PreparedStatement =>
  db
    .prepare(
      `INSERT INTO assignment_targets (assignment_id, student_id, tenant_id)
       SELECT a.id, j.value, a.tenant_id FROM assignments a, json_each(?1) j
       WHERE a.tenant_id = ?2 AND a.id = ?3`,
    )
    .bind(JSON.stringify(ids), tenantId, assignmentId);

/**
 * Saves changes only if nobody changed the assignment since the person opened it (same version).
 * `meta.changes` is 0 when the version is old.
 */
export const updateAssignmentStatement = (
  db: D1Database,
  o: { tenantId: string; id: string; version: number } & AssignmentWrite,
): D1PreparedStatement =>
  db
    .prepare(
      `UPDATE assignments SET type = ?1, title = ?2, instructions = ?3, questions = ?4, links = ?5, due_at = ?6,
         allow_late = ?7, max_score = ?8, target_mode = ?9, version = version + 1, updated_at = ?10
       WHERE tenant_id = ?11 AND id = ?12 AND version = ?13`,
    )
    .bind(
      o.type,
      o.title,
      o.instructions,
      JSON.stringify(o.questions),
      JSON.stringify(o.links),
      o.dueAt,
      o.allowLate ? 1 : 0,
      o.maxScore,
      o.targetMode,
      nowIso(),
      o.tenantId,
      o.id,
      o.version,
    );

/**
 * Saves the questions of an open or closed assignment (used to accept one more answer), only if nobody changed
 * the assignment since it was read. `meta.changes` is 0 when the version is old.
 */
export const setQuestionsStatement = (
  db: D1Database,
  o: { tenantId: string; id: string; version: number; questions: unknown[] },
): D1PreparedStatement =>
  db
    .prepare(
      `UPDATE assignments SET questions = ?1, version = version + 1, updated_at = ?2
       WHERE tenant_id = ?3 AND id = ?4 AND version = ?5 AND status IN ('published', 'closed')`,
    )
    .bind(JSON.stringify(o.questions), nowIso(), o.tenantId, o.id, o.version);

/** Replaces the chosen students, but only when the update just before it went through (version is now `newVersion`). */
export const clearTargetsStatement = (
  db: D1Database,
  tenantId: string,
  id: string,
  newVersion: number,
): D1PreparedStatement =>
  db
    .prepare(
      `DELETE FROM assignment_targets WHERE tenant_id = ?1 AND assignment_id = ?2
       AND EXISTS (SELECT 1 FROM assignments WHERE tenant_id = ?1 AND id = ?2 AND version = ?3)`,
    )
    .bind(tenantId, id, newVersion);

export const insertTargetsAfterUpdateStatement = (
  db: D1Database,
  tenantId: string,
  id: string,
  newVersion: number,
  ids: string[],
): D1PreparedStatement =>
  db
    .prepare(
      `INSERT INTO assignment_targets (assignment_id, student_id, tenant_id)
       SELECT a.id, j.value, a.tenant_id FROM assignments a, json_each(?1) j
       WHERE a.tenant_id = ?2 AND a.id = ?3 AND a.version = ?4 AND a.target_mode = 'selected'`,
    )
    .bind(JSON.stringify(ids), tenantId, id, newVersion);

/** draft or closed -> published. The course must not be archived. */
export const publishStatement = (db: D1Database, tenantId: string, id: string): D1PreparedStatement =>
  db
    .prepare(
      `UPDATE assignments SET status = 'published', published_at = COALESCE(published_at, ?1),
         version = version + 1, updated_at = ?1
       WHERE tenant_id = ?2 AND id = ?3 AND status IN ('draft', 'closed')
         AND EXISTS (SELECT 1 FROM courses c WHERE c.id = assignments.course_id AND c.status != 'archived')`,
    )
    .bind(nowIso(), tenantId, id);

export const closeStatement = (db: D1Database, tenantId: string, id: string): D1PreparedStatement =>
  db
    .prepare(
      `UPDATE assignments SET status = 'closed', version = version + 1, updated_at = ?
       WHERE tenant_id = ? AND id = ? AND status = 'published'`,
    )
    .bind(nowIso(), tenantId, id);

/**
 * The teacher deletes a piece of work. It is hidden everywhere from now on: nobody can open it, and it is in no list.
 * What the students handed in and the score history stay in the database (the history can never be erased).
 */
export const deleteAssignmentStatement = (
  db: D1Database,
  tenantId: string,
  id: string,
): D1PreparedStatement =>
  db
    .prepare(
      `UPDATE assignments SET deleted_at = ?1, version = version + 1, updated_at = ?1
       WHERE tenant_id = ?2 AND id = ?3 AND deleted_at IS NULL`,
    )
    .bind(nowIso(), tenantId, id);

/** The notifications that point to a deleted piece of work go away too, so nobody opens a page that is gone. */
export const deleteAssignmentNotificationsStatement = (
  db: D1Database,
  tenantId: string,
  id: string,
): D1PreparedStatement =>
  db
    .prepare(
      `DELETE FROM notifications WHERE tenant_id = ?1
       AND (link = '/my/work/' || ?2 OR link = '/assignments/' || ?2 OR instr(link, '/assignments/' || ?2 || '/') = 1)`,
    )
    .bind(tenantId, id);

export async function hasSubmissions(db: D1Database, tenantId: string, id: string): Promise<boolean> {
  return (
    (await db
      .prepare("SELECT 1 AS x FROM submissions WHERE tenant_id = ? AND assignment_id = ? LIMIT 1")
      .bind(tenantId, id)
      .first()) !== null
  );
}

// ------------------------------------------------------------------ course links

export interface MaterialRow {
  id: string;
  title: string;
  url: string;
  published: number;
  created_at: string;
}

export async function materialsOf(db: D1Database, tenantId: string, courseId: string) {
  const res = await db
    .prepare(
      `SELECT id, title, url, published, created_at FROM course_materials
       WHERE tenant_id = ? AND course_id = ? ORDER BY created_at, id`,
    )
    .bind(tenantId, courseId)
    .all<MaterialRow>();
  return res.results;
}

export const insertMaterialStatement = (
  db: D1Database,
  o: { id: string; tenantId: string; courseId: string; title: string; url: string; published: boolean },
): D1PreparedStatement => {
  const now = nowIso();
  return db
    .prepare(
      `INSERT INTO course_materials (id, tenant_id, course_id, title, url, published, created_at, updated_at)
       SELECT ?1, c.tenant_id, c.id, ?2, ?3, ?4, ?5, ?5 FROM courses c
       WHERE c.tenant_id = ?6 AND c.id = ?7 AND c.status != 'archived'`,
    )
    .bind(o.id, o.title, o.url, o.published ? 1 : 0, now, o.tenantId, o.courseId);
};

export const updateMaterialStatement = (
  db: D1Database,
  o: { tenantId: string; courseId: string; id: string; title: string; url: string; published: boolean },
): D1PreparedStatement =>
  db
    .prepare(
      `UPDATE course_materials SET title = ?, url = ?, published = ?, updated_at = ?
       WHERE tenant_id = ? AND course_id = ? AND id = ?`,
    )
    .bind(o.title, o.url, o.published ? 1 : 0, nowIso(), o.tenantId, o.courseId, o.id);

export const deleteMaterialStatement = (
  db: D1Database,
  tenantId: string,
  courseId: string,
  id: string,
): D1PreparedStatement =>
  db
    .prepare("DELETE FROM course_materials WHERE tenant_id = ? AND course_id = ? AND id = ?")
    .bind(tenantId, courseId, id);
