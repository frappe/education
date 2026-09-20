import { nowIso } from "../lib/time";

/**
 * Everything a student may see, and nothing else. The person is found from the session (the user id),
 * never from the request. Work shows only when: it is published or closed, the student is not archived,
 * is in the course now, the teacher's account is active, and the work is for everyone or for this student.
 * Fixed text. Expects the user id to be ?1.
 */
const VISIBLE = `FROM assignments a
  JOIN courses c ON c.id = a.course_id AND c.tenant_id = a.tenant_id AND c.status != 'archived' AND a.deleted_at IS NULL
  JOIN tenants t ON t.id = a.tenant_id AND t.status = 'active'
  JOIN students s ON s.tenant_id = a.tenant_id AND s.user_id = ?1 AND s.status != 'archived'
  JOIN enrollments e ON e.tenant_id = a.tenant_id AND e.course_id = a.course_id AND e.student_id = s.id AND e.status = 'active'
  LEFT JOIN submissions sub ON sub.assignment_id = a.id AND sub.student_id = s.id
  LEFT JOIN submission_extensions x ON x.assignment_id = a.id AND x.student_id = s.id
  WHERE a.status IN ('published', 'closed')
    AND (a.target_mode = 'all' OR EXISTS (SELECT 1 FROM assignment_targets g WHERE g.assignment_id = a.id AND g.student_id = s.id))`;

const COLUMNS = `a.id, a.tenant_id, a.course_id, c.name AS course_name, a.title, a.instructions, a.questions,
  a.links, a.due_at, a.allow_late, a.max_score, a.status AS assignment_status, t.timezone, s.id AS student_id,
  sub.status AS sub_status, sub.responses, sub.question_points, sub.question_notes, sub.submitted_at, sub.is_late, sub.score,
  sub.feedback, x.until_at`;

export interface MyWorkRow {
  id: string;
  tenant_id: string;
  course_id: string;
  course_name: string;
  title: string;
  instructions: string;
  questions: string;
  links: string;
  due_at: string | null;
  allow_late: number;
  max_score: number;
  assignment_status: "published" | "closed";
  timezone: string;
  student_id: string;
  sub_status: "drafted" | "submitted" | "graded" | "returned" | "revision_requested" | null;
  /** JSON: what the student answered, one entry for each question. */
  responses: string | null;
  /** JSON: the points of each question so far. */
  question_points: string | null;
  question_notes: string | null;
  submitted_at: string | null;
  is_late: number | null;
  score: number | null;
  feedback: string | null;
  until_at: string | null;
}

export async function myWork(db: D1Database, userId: string): Promise<MyWorkRow[]> {
  const res = await db
    .prepare(
      `SELECT ${COLUMNS} ${VISIBLE} ORDER BY (a.due_at IS NULL), a.due_at, a.created_at DESC LIMIT 500`,
    )
    .bind(userId)
    .all<MyWorkRow>();
  return res.results;
}

export const findMyWork = (db: D1Database, userId: string, id: string) =>
  db.prepare(`SELECT ${COLUMNS} ${VISIBLE} AND a.id = ?2`).bind(userId, id).first<MyWorkRow>();

export interface MyCourseRow {
  id: string;
  tenant_id: string;
  name: string;
  description: string;
  timezone: string;
  teacher_name: string | null;
}

const COURSE_FROM = `FROM enrollments e
  JOIN students s ON s.id = e.student_id AND s.tenant_id = e.tenant_id AND s.user_id = ?1 AND s.status != 'archived'
  JOIN courses c ON c.id = e.course_id AND c.tenant_id = e.tenant_id AND c.status != 'archived'
  JOIN tenants t ON t.id = c.tenant_id AND t.status = 'active'
  WHERE e.status = 'active'`;
const COURSE_COLUMNS = `c.id, c.tenant_id, c.name, c.description, t.timezone,
  (SELECT u.name FROM memberships m JOIN users u ON u.id = m.user_id
   WHERE m.tenant_id = c.tenant_id AND m.role = 'teacher' ORDER BY m.created_at LIMIT 1) AS teacher_name`;

export async function myCourses(db: D1Database, userId: string): Promise<MyCourseRow[]> {
  const res = await db
    .prepare(`SELECT ${COURSE_COLUMNS} ${COURSE_FROM} ORDER BY c.name COLLATE NOCASE, c.id`)
    .bind(userId)
    .all<MyCourseRow>();
  return res.results;
}

export interface MyLessonRow {
  id: string;
  course_id: string;
  course_name: string;
  timezone: string;
  title: string;
  starts_at: string;
  ends_at: string;
  place: string;
  online_url: string | null;
}

/**
 * The next lessons of the courses the student is in now: not cancelled and not over. The courses are found in the
 * same way as in the list of courses, so nothing is shown that the list does not show.
 */
export async function myUpcomingLessons(
  db: D1Database,
  userId: string,
  nowIso: string,
  limit: number,
): Promise<MyLessonRow[]> {
  const res = await db
    .prepare(
      `SELECT l.id, l.course_id, co.name AS course_name, tn.timezone, l.title, l.starts_at, l.ends_at, l.place, l.online_url
       FROM lessons l
       JOIN courses co ON co.id = l.course_id AND co.tenant_id = l.tenant_id
       JOIN tenants tn ON tn.id = l.tenant_id
       WHERE l.status = 'scheduled' AND l.ends_at >= ?2
         AND l.course_id IN (SELECT c.id ${COURSE_FROM})
       ORDER BY l.starts_at, l.id LIMIT ?3`,
    )
    .bind(userId, nowIso, limit)
    .all<MyLessonRow>();
  return res.results;
}

export const findMyCourse = (db: D1Database, userId: string, courseId: string) =>
  db
    .prepare(`SELECT ${COURSE_COLUMNS} ${COURSE_FROM} AND c.id = ?2`)
    .bind(userId, courseId)
    .first<MyCourseRow>();

export async function publishedMaterials(db: D1Database, tenantId: string, courseId: string) {
  const res = await db
    .prepare(
      `SELECT id, title, url FROM course_materials
       WHERE tenant_id = ? AND course_id = ? AND published = 1 ORDER BY created_at, id`,
    )
    .bind(tenantId, courseId)
    .all<{ id: string; title: string; url: string }>();
  return res.results;
}

/**
 * Saves a draft, or hands the work in, in ONE statement that checks everything at the moment it runs:
 * it is this student (found from the user id), the work is published, and the time is not up (unless late
 * work is allowed or the teacher gave this student more time). An answer that was already handed in
 * (or scored) is left alone. `meta.changes` is 0 when any check fails.
 *
 * `status` is "drafted" for a draft. For a hand-in it is "submitted" (the teacher scores some questions) or
 * "returned" (the system scored every question, so the student gets the result at once); then `points` and
 * `score` are the points the system gave.
 */
export const saveAnswerStatement = (
  db: D1Database,
  o: {
    id: string;
    userId: string;
    tenantId: string;
    studentId: string;
    assignmentId: string;
    status: "drafted" | "submitted" | "returned";
    responses: unknown[];
    points: Record<string, number>;
    score: number | null;
  },
): D1PreparedStatement => {
  const now = nowIso();
  // Within the time: no due date, not yet due, or the teacher gave this student more time.
  const onTime = `(a.due_at IS NULL OR a.due_at >= ?6 OR EXISTS (SELECT 1 FROM submission_extensions x
    WHERE x.assignment_id = a.id AND x.student_id = s.id AND x.until_at >= ?6))`;
  return db
    .prepare(
      `INSERT INTO submissions (id, tenant_id, assignment_id, student_id, status, responses, question_points, score,
         submitted_at, graded_at, returned_at, is_late, created_at, updated_at)
       SELECT ?1, a.tenant_id, a.id, s.id, ?2, ?3, ?4, ?5,
         CASE WHEN ?2 != 'drafted' THEN ?6 END, CASE WHEN ?2 = 'returned' THEN ?6 END, CASE WHEN ?2 = 'returned' THEN ?6 END,
         CASE WHEN ?2 != 'drafted' AND NOT ${onTime} THEN 1 ELSE 0 END, ?6, ?6
       FROM assignments a JOIN students s ON s.tenant_id = a.tenant_id AND s.id = ?7 AND s.user_id = ?8 AND s.status != 'archived'
       WHERE a.tenant_id = ?9 AND a.id = ?10 AND a.deleted_at IS NULL AND a.status = 'published' AND (a.allow_late = 1 OR ${onTime})
       ON CONFLICT (assignment_id, student_id) DO UPDATE SET
         status = CASE WHEN ?2 != 'drafted' THEN ?2 ELSE submissions.status END,
         responses = excluded.responses,
         question_points = CASE WHEN ?2 != 'drafted' THEN excluded.question_points ELSE submissions.question_points END,
         score = CASE WHEN ?2 != 'drafted' THEN excluded.score ELSE submissions.score END,
         submitted_at = CASE WHEN ?2 != 'drafted' THEN excluded.submitted_at ELSE submissions.submitted_at END,
         graded_at = CASE WHEN ?2 != 'drafted' THEN excluded.graded_at ELSE submissions.graded_at END,
         returned_at = CASE WHEN ?2 != 'drafted' THEN excluded.returned_at ELSE submissions.returned_at END,
         is_late = CASE WHEN ?2 != 'drafted' THEN excluded.is_late ELSE submissions.is_late END,
         revision_count = submissions.revision_count
           + CASE WHEN ?2 != 'drafted' AND submissions.status = 'revision_requested' THEN 1 ELSE 0 END,
         version = submissions.version + 1, updated_at = excluded.updated_at
       WHERE submissions.status IN ('drafted', 'revision_requested')`,
    )
    .bind(
      o.id,
      o.status,
      JSON.stringify(o.responses),
      JSON.stringify(o.points),
      o.score,
      now,
      o.studentId,
      o.userId,
      o.tenantId,
      o.assignmentId,
    );
};
