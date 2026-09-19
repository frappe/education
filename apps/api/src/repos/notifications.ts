import { nowIso } from "../lib/time";

/** The kinds of notification. They are shown in the app only. */
export type Kind =
  | "homework_new"
  | "homework_due"
  | "homework_returned"
  | "homework_again"
  | "receipt_sent"
  | "work_handed_in";

const NEW_ID = `lower(hex(randomblob(16)))`;

/** One notification for one student, with the words given. Nothing happens for a student who has no account yet. */
export const notifyStudentStatement = (
  db: D1Database,
  o: {
    tenantId: string;
    studentId: string;
    kind: Kind;
    title: string;
    body: string;
    link: string;
    dedupe: string | null;
  },
): D1PreparedStatement =>
  db
    .prepare(
      `INSERT INTO notifications (id, tenant_id, user_id, kind, title, body, link, created_at, dedupe_key)
       SELECT ${NEW_ID}, s.tenant_id, s.user_id, ?1, ?2, ?3, ?4, ?5, ?6
       FROM students s
       WHERE s.tenant_id = ?7 AND s.id = ?8 AND s.user_id IS NOT NULL
       ON CONFLICT DO NOTHING`,
    )
    .bind(o.kind, o.title, o.body, o.link, nowIso(), o.dedupe, o.tenantId, o.studentId);

/** A notification for a student about one piece of work: the title is `prefix` and the title of the work. */
export const notifyWorkStatement = (
  db: D1Database,
  o: {
    tenantId: string;
    assignmentId: string;
    studentId: string;
    kind: Kind;
    prefix: string;
    dedupe: string | null;
  },
): D1PreparedStatement =>
  db
    .prepare(
      `INSERT INTO notifications (id, tenant_id, user_id, kind, title, body, link, created_at, dedupe_key)
       SELECT ${NEW_ID}, s.tenant_id, s.user_id, ?1, ?2 || a.title, c.name, '/my/work/' || a.id, ?3, ?4
       FROM assignments a JOIN courses c ON c.id = a.course_id AND c.tenant_id = a.tenant_id
         JOIN students s ON s.tenant_id = a.tenant_id AND s.id = ?5 AND s.user_id IS NOT NULL
       WHERE a.tenant_id = ?6 AND a.id = ?7
       ON CONFLICT DO NOTHING`,
    )
    .bind(o.kind, o.prefix, nowIso(), o.dedupe, o.studentId, o.tenantId, o.assignmentId);

/** The teacher is told that a student handed in work. */
export const notifyHandInStatement = (
  db: D1Database,
  o: { tenantId: string; assignmentId: string; studentId: string },
): D1PreparedStatement =>
  db
    .prepare(
      `INSERT INTO notifications (id, tenant_id, user_id, kind, title, body, link, created_at)
       SELECT ${NEW_ID}, m.tenant_id, m.user_id, 'work_handed_in', s.name || ' handed in work', a.title || ' · ' || c.name,
         '/assignments/' || a.id || '/students/' || s.id, ?1
       FROM assignments a JOIN courses c ON c.id = a.course_id AND c.tenant_id = a.tenant_id
         JOIN students s ON s.tenant_id = a.tenant_id AND s.id = ?2
         JOIN memberships m ON m.tenant_id = a.tenant_id AND m.role = 'teacher'
       WHERE a.tenant_id = ?3 AND a.id = ?4`,
    )
    .bind(nowIso(), o.studentId, o.tenantId, o.assignmentId);

/**
 * Everyone who can see a piece of work that was just opened is told, once (opening it again later says nothing new).
 * Same people as in the student's list: in the course now, not archived, and the work is for everyone or for them.
 */
export const notifyPublishedStatement = (
  db: D1Database,
  tenantId: string,
  assignmentId: string,
): D1PreparedStatement =>
  db
    .prepare(
      `INSERT INTO notifications (id, tenant_id, user_id, kind, title, body, link, created_at, dedupe_key)
       SELECT ${NEW_ID}, a.tenant_id, s.user_id, 'homework_new', 'New homework: ' || a.title, c.name, '/my/work/' || a.id, ?1,
         'new:' || a.id
       FROM assignments a JOIN courses c ON c.id = a.course_id AND c.tenant_id = a.tenant_id
         JOIN enrollments e ON e.tenant_id = a.tenant_id AND e.course_id = a.course_id AND e.status = 'active'
         JOIN students s ON s.id = e.student_id AND s.tenant_id = a.tenant_id AND s.user_id IS NOT NULL AND s.status != 'archived'
       WHERE a.tenant_id = ?2 AND a.id = ?3 AND a.status = 'published'
         AND (a.target_mode = 'all' OR EXISTS (SELECT 1 FROM assignment_targets g WHERE g.assignment_id = a.id AND g.student_id = s.id))
       ON CONFLICT DO NOTHING`,
    )
    .bind(nowIso(), tenantId, assignmentId);

/**
 * A reminder for everyone who has not handed in work that is due between `fromIso` and `untilIso` (once for each
 * person and piece of work). Work with no due date never sends one.
 */
export const notifyDueSoonStatement = (
  db: D1Database,
  fromIso: string,
  untilIso: string,
): D1PreparedStatement =>
  db
    .prepare(
      `INSERT INTO notifications (id, tenant_id, user_id, kind, title, body, link, created_at, dedupe_key)
       SELECT ${NEW_ID}, a.tenant_id, s.user_id, 'homework_due', 'Due soon: ' || a.title, c.name, '/my/work/' || a.id, ?1,
         'due:' || a.id
       FROM assignments a JOIN courses c ON c.id = a.course_id AND c.tenant_id = a.tenant_id AND c.status != 'archived'
         JOIN enrollments e ON e.tenant_id = a.tenant_id AND e.course_id = a.course_id AND e.status = 'active'
         JOIN students s ON s.id = e.student_id AND s.tenant_id = a.tenant_id AND s.user_id IS NOT NULL AND s.status != 'archived'
         LEFT JOIN submissions sub ON sub.assignment_id = a.id AND sub.student_id = s.id
       WHERE a.status = 'published' AND a.due_at > ?2 AND a.due_at <= ?3
         AND (sub.id IS NULL OR sub.status IN ('drafted', 'revision_requested'))
         AND (a.target_mode = 'all' OR EXISTS (SELECT 1 FROM assignment_targets g WHERE g.assignment_id = a.id AND g.student_id = s.id))
       ON CONFLICT DO NOTHING`,
    )
    .bind(nowIso(), fromIso, untilIso);

// ---------------------------------------------------------------------- reading

export interface NotificationRow {
  id: string;
  kind: string;
  title: string;
  body: string;
  link: string;
  created_at: string;
  read_at: string | null;
}

/** The person's own notifications, newest first. Always found by the user id from the session. */
export const notificationsOf = async (db: D1Database, userId: string, limit: number) =>
  (
    await db
      .prepare(
        `SELECT id, kind, title, body, link, created_at, read_at FROM notifications
         WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT ?`,
      )
      .bind(userId, limit)
      .all<NotificationRow>()
  ).results;

export const unreadCount = async (db: D1Database, userId: string) =>
  (
    await db
      .prepare("SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read_at IS NULL")
      .bind(userId)
      .first<{ n: number }>()
  )?.n ?? 0;

/** Marks some of the person's notifications as read (`ids`), or all of them (null). Others' rows are never touched. */
export const markReadStatement = (
  db: D1Database,
  userId: string,
  ids: string[] | null,
): D1PreparedStatement =>
  db
    .prepare(
      `UPDATE notifications SET read_at = ?1
       WHERE user_id = ?2 AND read_at IS NULL AND (?3 IS NULL OR id IN (SELECT value FROM json_each(?3)))`,
    )
    .bind(nowIso(), userId, ids === null ? null : JSON.stringify(ids));

/** Old notifications are removed after 90 days. */
export const cleanupStatement = (db: D1Database, olderThanIso: string): D1PreparedStatement =>
  db.prepare("DELETE FROM notifications WHERE created_at < ?").bind(olderThanIso);
