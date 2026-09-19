import { uuidv7 } from "../lib/id";
import { nowIso } from "../lib/time";
import { placeholders } from "./sql";

export interface StudentRow {
  id: string;
  tenant_id: string;
  user_id: string | null;
  name: string;
  email: string;
  status: "invited" | "active" | "archived";
  phone: string;
  teacher_note: string;
  version: number;
  created_at: string;
}

/** Every student query takes the tenant id, so a row of another teacher can never be returned. */
export const findStudentByEmail = (db: D1Database, tenantId: string, email: string) =>
  db
    .prepare(
      "SELECT id, tenant_id, user_id, name, email, status, phone, teacher_note, version, created_at FROM students WHERE tenant_id = ? AND email = ?",
    )
    .bind(tenantId, email)
    .first<StudentRow>();

export const findStudent = (db: D1Database, tenantId: string, id: string) =>
  db
    .prepare(
      "SELECT id, tenant_id, user_id, name, email, status, phone, teacher_note, version, created_at FROM students WHERE tenant_id = ? AND id = ?",
    )
    .bind(tenantId, id)
    .first<StudentRow>();

export const insertStudent = (
  db: D1Database,
  s: { id: string; tenantId: string; name: string; email: string; phone?: string },
): D1PreparedStatement => {
  const now = nowIso();
  return db
    .prepare(
      "INSERT INTO students (id, tenant_id, name, email, phone, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'invited', ?, ?)",
    )
    .bind(s.id, s.tenantId, s.name, s.email, s.phone ?? "", now, now);
};

export const reinviteStudent = (
  db: D1Database,
  tenantId: string,
  id: string,
  name: string,
): D1PreparedStatement =>
  db
    .prepare(
      "UPDATE students SET name = ?, status = 'invited', updated_at = ? WHERE tenant_id = ? AND id = ?",
    )
    .bind(name, nowIso(), tenantId, id);

export const activateStudent = (
  db: D1Database,
  tenantId: string,
  id: string,
  userId: string,
): D1PreparedStatement =>
  db
    .prepare(
      "UPDATE students SET user_id = ?, status = 'active', updated_at = ? WHERE tenant_id = ? AND id = ?",
    )
    .bind(userId, nowIso(), tenantId, id);

export interface InviteRow {
  id: string;
  name: string;
  email: string;
  sent_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
}

export async function listInvites(db: D1Database, tenantId: string): Promise<InviteRow[]> {
  const res = await db
    .prepare(
      `SELECT s.id, s.name, s.email,
         (SELECT created_at FROM auth_tokens t WHERE t.student_id = s.id AND t.kind = 'invite' ORDER BY created_at DESC LIMIT 1) AS sent_at,
         (SELECT expires_at FROM auth_tokens t WHERE t.student_id = s.id AND t.kind = 'invite' ORDER BY created_at DESC LIMIT 1) AS expires_at,
         (SELECT revoked_at FROM auth_tokens t WHERE t.student_id = s.id AND t.kind = 'invite' ORDER BY created_at DESC LIMIT 1) AS revoked_at
       FROM students s WHERE s.tenant_id = ? AND s.status = 'invited'
         AND EXISTS (SELECT 1 FROM auth_tokens t WHERE t.student_id = s.id AND t.kind = 'invite')
       ORDER BY s.created_at DESC`,
    )
    .bind(tenantId)
    .all<InviteRow>();
  return res.results;
}

export const newStudentId = (): string => uuidv7();

export interface StudentListRow extends StudentRow {
  ever_invited: number;
}

/** Turns a search text into a safe LIKE pattern: %, _ and \ typed by the person are matched literally. */
export const likePattern = (text: string): string => `%${text.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

export async function listStudents(
  db: D1Database,
  tenantId: string,
  o: { search: string; includeArchived: boolean; limit: number; offset: number },
): Promise<{ rows: StudentListRow[]; total: number }> {
  const pattern = likePattern(o.search);
  const where = `s.tenant_id = ?1 AND (?2 = 1 OR s.status != 'archived')
    AND (?3 = '' OR s.name LIKE ?4 ESCAPE '\\' OR s.email LIKE ?4 ESCAPE '\\')`;
  const binds = [tenantId, o.includeArchived ? 1 : 0, o.search, pattern] as const;
  const [rows, total] = await db.batch([
    db
      .prepare(
        `SELECT s.id, s.tenant_id, s.user_id, s.name, s.email, s.status, s.phone, s.teacher_note, s.version, s.created_at,
           EXISTS (SELECT 1 FROM auth_tokens t WHERE t.student_id = s.id AND t.kind = 'invite') AS ever_invited
         FROM students s WHERE ${where} ORDER BY s.name COLLATE NOCASE, s.id LIMIT ?5 OFFSET ?6`,
      )
      .bind(...binds, o.limit, o.offset),
    db.prepare(`SELECT COUNT(*) AS n FROM students s WHERE ${where}`).bind(...binds),
  ]);
  return {
    rows: (rows as D1Result<StudentListRow>).results,
    total: ((total as D1Result<{ n: number }>).results[0]?.n ?? 0) as number,
  };
}

export async function findStudentWithInvite(
  db: D1Database,
  tenantId: string,
  id: string,
): Promise<StudentListRow | null> {
  return db
    .prepare(
      `SELECT s.id, s.tenant_id, s.user_id, s.name, s.email, s.status, s.phone, s.teacher_note, s.version, s.created_at,
         EXISTS (SELECT 1 FROM auth_tokens t WHERE t.student_id = s.id AND t.kind = 'invite') AS ever_invited
       FROM students s WHERE s.tenant_id = ? AND s.id = ?`,
    )
    .bind(tenantId, id)
    .first<StudentListRow>();
}

export const updateStudentProfile = (
  db: D1Database,
  tenantId: string,
  id: string,
  version: number,
  p: { name: string; phone: string; teacherNote: string },
): D1PreparedStatement =>
  db
    .prepare(
      `UPDATE students SET name = ?, phone = ?, teacher_note = ?, version = version + 1, updated_at = ?
       WHERE tenant_id = ? AND id = ? AND version = ?`,
    )
    .bind(p.name, p.phone, p.teacherNote, nowIso(), tenantId, id, version);

/** Archiving hides a student. Restoring puts them back as joined (has an account) or not joined. */
export const setStudentArchived = (
  db: D1Database,
  tenantId: string,
  id: string,
  archived: boolean,
): D1PreparedStatement =>
  db
    .prepare(
      archived
        ? "UPDATE students SET status = 'archived', version = version + 1, updated_at = ?1 WHERE tenant_id = ?2 AND id = ?3 AND status != 'archived'"
        : "UPDATE students SET status = CASE WHEN user_id IS NULL THEN 'invited' ELSE 'active' END, version = version + 1, updated_at = ?1 WHERE tenant_id = ?2 AND id = ?3 AND status = 'archived'",
    )
    .bind(nowIso(), tenantId, id);

/** Emails that already belong to this tenant, from a list. Used by the CSV import check. */
export async function existingEmails(
  db: D1Database,
  tenantId: string,
  emails: string[],
): Promise<Set<string>> {
  const found = new Set<string>();
  for (let i = 0; i < emails.length; i += 50) {
    const chunk = emails.slice(i, i + 50);
    const res = await db
      .prepare(`SELECT email FROM students WHERE tenant_id = ? AND email IN (${placeholders(chunk.length)})`)
      .bind(tenantId, ...chunk)
      .all<{ email: string }>();
    for (const r of res.results) found.add(r.email);
  }
  return found;
}
