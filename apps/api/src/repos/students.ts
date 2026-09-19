import { uuidv7 } from "../lib/id";
import { nowIso } from "../lib/time";

export interface StudentRow {
  id: string;
  tenant_id: string;
  user_id: string | null;
  name: string;
  email: string;
  status: "invited" | "active" | "archived";
}

/** Every student query takes the tenant id, so a row of another teacher can never be returned. */
export const findStudentByEmail = (db: D1Database, tenantId: string, email: string) =>
  db
    .prepare(
      "SELECT id, tenant_id, user_id, name, email, status FROM students WHERE tenant_id = ? AND email = ?",
    )
    .bind(tenantId, email)
    .first<StudentRow>();

export const findStudent = (db: D1Database, tenantId: string, id: string) =>
  db
    .prepare(
      "SELECT id, tenant_id, user_id, name, email, status FROM students WHERE tenant_id = ? AND id = ?",
    )
    .bind(tenantId, id)
    .first<StudentRow>();

export const insertStudent = (
  db: D1Database,
  s: { id: string; tenantId: string; name: string; email: string },
): D1PreparedStatement => {
  const now = nowIso();
  return db
    .prepare(
      "INSERT INTO students (id, tenant_id, name, email, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'invited', ?, ?)",
    )
    .bind(s.id, s.tenantId, s.name, s.email, now, now);
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
       FROM students s WHERE s.tenant_id = ? AND s.status = 'invited' ORDER BY s.created_at DESC`,
    )
    .bind(tenantId)
    .all<InviteRow>();
  return res.results;
}

export const newStudentId = (): string => uuidv7();
