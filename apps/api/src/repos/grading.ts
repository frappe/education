import type { SubmissionStatus } from "@lms/shared";
import { nowIso } from "../lib/time";

export interface RosterRow {
  student_id: string;
  name: string;
  status: SubmissionStatus | null;
  is_late: number | null;
  submitted_at: string | null;
  score: number | null;
  version: number | null;
  until_at: string | null;
}

/**
 * The students a piece of work is about: those it is for and who are in the course now, plus anyone who
 * already handed something in (so nothing a student did is ever hidden from the teacher).
 */
export async function rosterOf(
  db: D1Database,
  tenantId: string,
  assignmentId: string,
  courseId: string,
  mode: "all" | "selected",
): Promise<RosterRow[]> {
  const res = await db
    .prepare(
      `SELECT s.id AS student_id, s.name, sub.status, sub.is_late, sub.submitted_at, sub.score, sub.version, x.until_at
       FROM students s
       LEFT JOIN enrollments e ON e.tenant_id = s.tenant_id AND e.student_id = s.id AND e.course_id = ?3 AND e.status = 'active'
       LEFT JOIN submissions sub ON sub.assignment_id = ?2 AND sub.student_id = s.id AND sub.status != 'drafted'
       LEFT JOIN submission_extensions x ON x.assignment_id = ?2 AND x.student_id = s.id
       WHERE s.tenant_id = ?1
         AND ((e.student_id IS NOT NULL AND s.status != 'archived'
               AND (?4 = 'all' OR EXISTS (SELECT 1 FROM assignment_targets g WHERE g.assignment_id = ?2 AND g.student_id = s.id)))
              OR sub.id IS NOT NULL)
       ORDER BY CASE sub.status WHEN 'submitted' THEN 0 WHEN 'revision_requested' THEN 3 WHEN 'graded' THEN 1 WHEN 'returned' THEN 2 ELSE 4 END,
                s.name COLLATE NOCASE, s.id`,
    )
    .bind(tenantId, assignmentId, courseId, mode)
    .all<RosterRow>();
  return res.results;
}

export interface SubmissionRowFull {
  id: string;
  student_id: string;
  student_name: string;
  status: SubmissionStatus;
  responses: string;
  question_points: string;
  question_notes: string;
  submitted_at: string | null;
  is_late: number;
  revision_count: number;
  score: number | null;
  feedback: string;
  version: number;
  until_at: string | null;
}

/** Every submission query takes the tenant id, so another teacher's answer is never returned. */
export const findSubmission = (db: D1Database, tenantId: string, assignmentId: string, studentId: string) =>
  db
    .prepare(
      `SELECT sub.id, sub.student_id, s.name AS student_name, sub.status, sub.responses, sub.question_points, sub.question_notes,
         sub.submitted_at, sub.is_late, sub.revision_count, sub.score, sub.feedback, sub.version, x.until_at
       FROM submissions sub JOIN students s ON s.id = sub.student_id AND s.tenant_id = sub.tenant_id
       LEFT JOIN submission_extensions x ON x.assignment_id = sub.assignment_id AND x.student_id = sub.student_id
       WHERE sub.tenant_id = ? AND sub.assignment_id = ? AND sub.student_id = ? AND sub.status != 'drafted'`,
    )
    .bind(tenantId, assignmentId, studentId)
    .first<SubmissionRowFull>();

export async function historyOf(db: D1Database, tenantId: string, submissionId: string) {
  const res = await db
    .prepare(
      `SELECT r.at, u.name AS by_name, r.old_score, r.new_score, r.old_feedback, r.new_feedback, r.old_notes, r.new_notes
       FROM grade_revisions r JOIN users u ON u.id = r.actor_user_id
       WHERE r.tenant_id = ? AND r.submission_id = ? ORDER BY r.at DESC, r.rowid DESC`,
    )
    .bind(tenantId, submissionId)
    .all<{
      at: string;
      by_name: string;
      old_score: number | null;
      new_score: number | null;
      old_feedback: string;
      new_feedback: string;
      old_notes: string;
      new_notes: string;
    }>();
  return res.results;
}

/**
 * Saves the points, the total score and feedback only if the answer is still the one the teacher looked at (same version) and
 * is handed in. A returned one stays returned (the student sees the change at once); otherwise it becomes
 * "graded" (still hidden from the student). `meta.changes` is 0 when a check fails.
 */
export const gradeStatement = (
  db: D1Database,
  o: {
    tenantId: string;
    assignmentId: string;
    studentId: string;
    version: number;
    score: number;
    points: Record<string, number>;
    notes: Record<string, string>;
    feedback: string;
    graderId: string;
  },
): D1PreparedStatement =>
  db
    .prepare(
      `UPDATE submissions SET score = ?1, feedback = ?2, question_points = ?9, question_notes = ?10,
         status = CASE WHEN status = 'returned' THEN 'returned' ELSE 'graded' END,
         graded_at = ?3, version = version + 1, updated_at = ?3, last_grader_id = ?8
       WHERE tenant_id = ?4 AND assignment_id = ?5 AND student_id = ?6 AND version = ?7
         AND status IN ('submitted', 'graded', 'returned')`,
    )
    .bind(
      o.score,
      o.feedback,
      nowIso(),
      o.tenantId,
      o.assignmentId,
      o.studentId,
      o.version,
      o.graderId,
      JSON.stringify(o.points),
      JSON.stringify(o.notes),
    );

/** The student sees the score and feedback from now on. Needs a score, and the version the teacher looked at. */
export const returnStatement = (
  db: D1Database,
  o: { tenantId: string; assignmentId: string; studentId: string; version: number },
): D1PreparedStatement =>
  db
    .prepare(
      `UPDATE submissions SET status = 'returned', returned_at = ?1, version = version + 1, updated_at = ?1
       WHERE tenant_id = ?2 AND assignment_id = ?3 AND student_id = ?4 AND version = ?5
         AND status = 'graded' AND score IS NOT NULL`,
    )
    .bind(nowIso(), o.tenantId, o.assignmentId, o.studentId, o.version);

/** Asks the student to do it again, with the reason as the feedback. The student can then change and hand in again. */
export const requestRevisionStatement = (
  db: D1Database,
  o: {
    tenantId: string;
    assignmentId: string;
    studentId: string;
    version: number;
    feedback: string;
    graderId: string;
  },
): D1PreparedStatement =>
  db
    .prepare(
      `UPDATE submissions SET status = 'revision_requested', feedback = ?1, version = version + 1, updated_at = ?2,
         last_grader_id = ?7
       WHERE tenant_id = ?3 AND assignment_id = ?4 AND student_id = ?5 AND version = ?6
         AND status IN ('submitted', 'graded', 'returned')`,
    )
    .bind(o.feedback, nowIso(), o.tenantId, o.assignmentId, o.studentId, o.version, o.graderId);

/** More time for one student who is in this course's work. Only for students of this tenant. */
export const setExtensionStatement = (
  db: D1Database,
  o: { tenantId: string; assignmentId: string; studentId: string; untilAt: string },
): D1PreparedStatement =>
  db
    .prepare(
      `INSERT INTO submission_extensions (assignment_id, student_id, tenant_id, until_at)
       SELECT a.id, s.id, a.tenant_id, ?1 FROM assignments a JOIN students s ON s.tenant_id = a.tenant_id
       WHERE a.tenant_id = ?2 AND a.id = ?3 AND s.id = ?4
       ON CONFLICT (assignment_id, student_id) DO UPDATE SET until_at = excluded.until_at`,
    )
    .bind(o.untilAt, o.tenantId, o.assignmentId, o.studentId);

export const clearExtensionStatement = (
  db: D1Database,
  tenantId: string,
  assignmentId: string,
  studentId: string,
): D1PreparedStatement =>
  db
    .prepare("DELETE FROM submission_extensions WHERE tenant_id = ? AND assignment_id = ? AND student_id = ?")
    .bind(tenantId, assignmentId, studentId);

export interface QueueRow {
  assignment_id: string;
  title: string;
  course_id: string;
  course_name: string;
  student_id: string;
  student_name: string;
  submitted_at: string;
  is_late: number;
}

/** Work waiting for a score, the oldest first. */
export async function queueOf(db: D1Database, tenantId: string): Promise<QueueRow[]> {
  const res = await db
    .prepare(
      `SELECT a.id AS assignment_id, a.title, a.course_id, c.name AS course_name, s.id AS student_id,
         s.name AS student_name, sub.submitted_at, sub.is_late
       FROM submissions sub
       JOIN assignments a ON a.id = sub.assignment_id AND a.tenant_id = sub.tenant_id
       JOIN courses c ON c.id = a.course_id AND c.tenant_id = a.tenant_id
       JOIN students s ON s.id = sub.student_id AND s.tenant_id = sub.tenant_id
       WHERE sub.tenant_id = ? AND sub.status = 'submitted'
       ORDER BY sub.submitted_at, sub.id LIMIT 200`,
    )
    .bind(tenantId)
    .all<QueueRow>();
  return res.results;
}

export interface RegradeRow {
  id: string;
  version: number;
  responses: string;
  question_points: string;
}

/** The answers that are handed in (and may already be scored) for one piece of work. */
export async function handedInAnswers(db: D1Database, tenantId: string, assignmentId: string) {
  const res = await db
    .prepare(
      `SELECT id, version, responses, question_points FROM submissions
       WHERE tenant_id = ? AND assignment_id = ? AND status IN ('submitted', 'graded', 'returned')`,
    )
    .bind(tenantId, assignmentId)
    .all<RegradeRow>();
  return res.results;
}

/**
 * Gives points for one question to the answers listed (each with the version it was read at and how many points
 * to add), in ONE statement. The total is only changed for an answer that already has one. It runs only while the
 * assignment is at the version `expectVersion`, and only for an answer that still has that version, so a change
 * made a moment ago is never overwritten. The score history is written by the database (see 0009).
 */
export const regradeStatement = (
  db: D1Database,
  o: {
    tenantId: string;
    assignmentId: string;
    expectVersion: number;
    questionId: string;
    points: number;
    rows: { id: string; version: number; delta: number }[];
    graderId: string;
  },
): D1PreparedStatement =>
  db
    .prepare(
      `UPDATE submissions SET
         question_points = json_set(question_points, '$.' || ?1, ?2),
         score = CASE WHEN score IS NULL THEN NULL ELSE score + json_extract(j.value, '$.delta') END,
         version = submissions.version + 1, updated_at = ?3, last_grader_id = ?4
       FROM json_each(?5) j
       WHERE submissions.id = json_extract(j.value, '$.id') AND submissions.version = json_extract(j.value, '$.version')
         AND submissions.tenant_id = ?6 AND submissions.assignment_id = ?7
         AND submissions.status IN ('submitted', 'graded', 'returned')
         AND EXISTS (SELECT 1 FROM assignments a WHERE a.id = ?7 AND a.tenant_id = ?6 AND a.version = ?8)`,
    )
    .bind(
      o.questionId,
      o.points,
      nowIso(),
      o.graderId,
      JSON.stringify(o.rows),
      o.tenantId,
      o.assignmentId,
      o.expectVersion,
    );
