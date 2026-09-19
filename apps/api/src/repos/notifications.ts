import { nowIso } from "../lib/time";

/** The kinds of notification. Only some are also sent as email (and can be turned off). */
export const KINDS = {
  homework_new: { email: true },
  homework_due: { email: true },
  homework_returned: { email: true },
  homework_again: { email: true },
  receipt_sent: { email: false },
  work_handed_in: { email: false },
} as const;
export type Kind = keyof typeof KINDS;

/**
 * SQL for the columns that come from the kind: the email waits to be sent unless this kind is not sent by email,
 * or the person turned it off. Fixed text; `?` values are always bound.
 */
const EMAIL_STATE = `CASE WHEN ? = 1 AND instr(u.email_muted, '"' || ? || '"') = 0 THEN 'pending' ELSE 'none' END`;
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
      `INSERT INTO notifications (id, tenant_id, user_id, kind, title, body, link, created_at, dedupe_key, email_state)
       SELECT ${NEW_ID}, s.tenant_id, s.user_id, ?1, ?2, ?3, ?4, ?5, ?6, ${EMAIL_STATE}
       FROM students s JOIN users u ON u.id = s.user_id
       WHERE s.tenant_id = ?9 AND s.id = ?10 AND s.user_id IS NOT NULL
       ON CONFLICT DO NOTHING`,
    )
    .bind(
      o.kind,
      o.title,
      o.body,
      o.link,
      nowIso(),
      o.dedupe,
      KINDS[o.kind].email ? 1 : 0,
      o.kind,
      o.tenantId,
      o.studentId,
    );

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
      `INSERT INTO notifications (id, tenant_id, user_id, kind, title, body, link, created_at, dedupe_key, email_state)
       SELECT ${NEW_ID}, s.tenant_id, s.user_id, ?1, ?2 || a.title, c.name, '/my/work/' || a.id, ?3, ?4, ${EMAIL_STATE}
       FROM assignments a JOIN courses c ON c.id = a.course_id AND c.tenant_id = a.tenant_id
         JOIN students s ON s.tenant_id = a.tenant_id AND s.id = ?7 AND s.user_id IS NOT NULL
         JOIN users u ON u.id = s.user_id
       WHERE a.tenant_id = ?8 AND a.id = ?9
       ON CONFLICT DO NOTHING`,
    )
    .bind(
      o.kind,
      o.prefix,
      nowIso(),
      o.dedupe,
      KINDS[o.kind].email ? 1 : 0,
      o.kind,
      o.studentId,
      o.tenantId,
      o.assignmentId,
    );

/** The teacher is told that a student handed in work. In the app only. */
export const notifyHandInStatement = (
  db: D1Database,
  o: { tenantId: string; assignmentId: string; studentId: string },
): D1PreparedStatement =>
  db
    .prepare(
      `INSERT INTO notifications (id, tenant_id, user_id, kind, title, body, link, created_at, email_state)
       SELECT ${NEW_ID}, m.tenant_id, m.user_id, 'work_handed_in', s.name || ' handed in work', a.title || ' · ' || c.name,
         '/assignments/' || a.id || '/students/' || s.id, ?1, 'none'
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
      `INSERT INTO notifications (id, tenant_id, user_id, kind, title, body, link, created_at, dedupe_key, email_state)
       SELECT ${NEW_ID}, a.tenant_id, s.user_id, 'homework_new', 'New homework: ' || a.title, c.name, '/my/work/' || a.id, ?1,
         'new:' || a.id, ${EMAIL_STATE}
       FROM assignments a JOIN courses c ON c.id = a.course_id AND c.tenant_id = a.tenant_id
         JOIN enrollments e ON e.tenant_id = a.tenant_id AND e.course_id = a.course_id AND e.status = 'active'
         JOIN students s ON s.id = e.student_id AND s.tenant_id = a.tenant_id AND s.user_id IS NOT NULL AND s.status != 'archived'
         JOIN users u ON u.id = s.user_id
       WHERE a.tenant_id = ?4 AND a.id = ?5 AND a.status = 'published'
         AND (a.target_mode = 'all' OR EXISTS (SELECT 1 FROM assignment_targets g WHERE g.assignment_id = a.id AND g.student_id = s.id))
       ON CONFLICT DO NOTHING`,
    )
    .bind(nowIso(), KINDS.homework_new.email ? 1 : 0, "homework_new", tenantId, assignmentId);

/**
 * A reminder for everyone who has not handed in work that is due in the next `hours` hours (once for each person and
 * piece of work). Work with no due date never sends one.
 */
export const notifyDueSoonStatement = (
  db: D1Database,
  fromIso: string,
  untilIso: string,
): D1PreparedStatement =>
  db
    .prepare(
      `INSERT INTO notifications (id, tenant_id, user_id, kind, title, body, link, created_at, dedupe_key, email_state)
       SELECT ${NEW_ID}, a.tenant_id, s.user_id, 'homework_due', 'Due soon: ' || a.title, c.name, '/my/work/' || a.id, ?1,
         'due:' || a.id, ${EMAIL_STATE}
       FROM assignments a JOIN courses c ON c.id = a.course_id AND c.tenant_id = a.tenant_id AND c.status != 'archived'
         JOIN enrollments e ON e.tenant_id = a.tenant_id AND e.course_id = a.course_id AND e.status = 'active'
         JOIN students s ON s.id = e.student_id AND s.tenant_id = a.tenant_id AND s.user_id IS NOT NULL AND s.status != 'archived'
         JOIN users u ON u.id = s.user_id
         LEFT JOIN submissions sub ON sub.assignment_id = a.id AND sub.student_id = s.id
       WHERE a.status = 'published' AND a.due_at > ?4 AND a.due_at <= ?5
         AND (sub.id IS NULL OR sub.status IN ('drafted', 'revision_requested'))
         AND (a.target_mode = 'all' OR EXISTS (SELECT 1 FROM assignment_targets g WHERE g.assignment_id = a.id AND g.student_id = s.id))
       ON CONFLICT DO NOTHING`,
    )
    .bind(nowIso(), KINDS.homework_due.email ? 1 : 0, "homework_due", fromIso, untilIso);

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

export const mutedKindsOf = async (db: D1Database, userId: string): Promise<string[]> => {
  const row = await db
    .prepare("SELECT email_muted FROM users WHERE id = ?")
    .bind(userId)
    .first<{ email_muted: string }>();
  try {
    const v: unknown = JSON.parse(row?.email_muted ?? "[]");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
};

export const setMutedKindsStatement = (
  db: D1Database,
  userId: string,
  kinds: string[],
): D1PreparedStatement =>
  db.prepare("UPDATE users SET email_muted = ? WHERE id = ?").bind(JSON.stringify(kinds), userId);

// ----------------------------------------------------------------- the email job

export interface PendingRow {
  id: string;
  user_id: string;
  email: string;
  name: string;
  title: string;
  body: string;
  link: string;
}

/**
 * The emails waiting, oldest first: at most `people` different people, and at most `perPerson` notifications for each
 * (the rest wait for the next run). A person who turned this kind off after it was made is skipped and marked.
 */
export async function pendingEmails(
  db: D1Database,
  people: number,
  perPerson: number,
): Promise<PendingRow[]> {
  const res = await db
    .prepare(
      `WITH first_people AS (
         SELECT user_id, MIN(created_at) AS first_at FROM notifications WHERE email_state = 'pending'
         GROUP BY user_id ORDER BY first_at LIMIT ?1
       )
       SELECT n.id, n.user_id, u.email, u.name, n.title, n.body, n.link
       FROM notifications n JOIN first_people f ON f.user_id = n.user_id JOIN users u ON u.id = n.user_id
       WHERE n.email_state = 'pending' AND u.disabled_at IS NULL
         AND (SELECT COUNT(*) FROM notifications x WHERE x.user_id = n.user_id AND x.email_state = 'pending'
              AND (x.created_at < n.created_at OR (x.created_at = n.created_at AND x.id < n.id))) < ?2
       ORDER BY f.first_at, n.user_id, n.created_at, n.id`,
    )
    .bind(people, perPerson)
    .all<PendingRow>();
  return res.results;
}

/** After an email: those notifications are sent, or (after 3 tries) given up. */
export const emailDoneStatement = (db: D1Database, ids: string[], ok: boolean): D1PreparedStatement =>
  db
    .prepare(
      `UPDATE notifications SET
         email_state = CASE WHEN ?1 = 1 THEN 'sent' WHEN email_tries + 1 >= 3 THEN 'failed' ELSE 'pending' END,
         email_tries = email_tries + CASE WHEN ?1 = 1 THEN 0 ELSE 1 END
       WHERE email_state = 'pending' AND id IN (SELECT value FROM json_each(?2))`,
    )
    .bind(ok ? 1 : 0, JSON.stringify(ids));

/** Notifications of disabled accounts never get an email. Old notifications are removed after 90 days. */
export const cleanupStatements = (db: D1Database, olderThanIso: string): D1PreparedStatement[] => [
  db.prepare(
    `UPDATE notifications SET email_state = 'none'
       WHERE email_state = 'pending' AND user_id IN (SELECT id FROM users WHERE disabled_at IS NOT NULL)`,
  ),
  db.prepare("DELETE FROM notifications WHERE created_at < ?").bind(olderThanIso),
];
