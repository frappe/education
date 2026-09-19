import { uuidv7 } from "../lib/id";
import { nowIso } from "../lib/time";

export interface UserRow {
  id: string;
  email: string;
  name: string;
  password_hash: string | null;
  email_verified_at: string | null;
  disabled_at: string | null;
}

export const findUserByEmail = (db: D1Database, email: string) =>
  db
    .prepare(
      "SELECT id, email, name, password_hash, email_verified_at, disabled_at FROM users WHERE email = ?",
    )
    .bind(email)
    .first<UserRow>();

export const findUserById = (db: D1Database, id: string) =>
  db
    .prepare("SELECT id, email, name, password_hash, email_verified_at, disabled_at FROM users WHERE id = ?")
    .bind(id)
    .first<UserRow>();

export function insertUser(
  db: D1Database,
  u: { id: string; email: string; name: string; passwordHash: string | null; verified: boolean },
): D1PreparedStatement {
  const now = nowIso();
  return db
    .prepare(
      `INSERT INTO users (id, email, name, password_hash, email_verified_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(u.id, u.email, u.name, u.passwordHash, u.verified ? now : null, now, now);
}

export function insertTenant(db: D1Database, t: { id: string; name: string }): D1PreparedStatement {
  return db
    .prepare("INSERT INTO tenants (id, name, created_at) VALUES (?, ?, ?)")
    .bind(t.id, t.name, nowIso());
}

export function insertMembership(
  db: D1Database,
  m: { userId: string; tenantId: string; role: "teacher" | "student" },
): D1PreparedStatement {
  return db
    .prepare(
      "INSERT OR IGNORE INTO memberships (id, user_id, tenant_id, role, created_at) VALUES (?, ?, ?, ?, ?)",
    )
    .bind(uuidv7(), m.userId, m.tenantId, m.role, nowIso());
}

export const markEmailVerified = (db: D1Database, userId: string): D1PreparedStatement =>
  db
    .prepare(
      "UPDATE users SET email_verified_at = COALESCE(email_verified_at, ?1), updated_at = ?1 WHERE id = ?2",
    )
    .bind(nowIso(), userId);

export interface MembershipRow {
  tenant_id: string;
  tenant_name: string;
  role: "teacher" | "student";
}

/** Only active tenants. A paused teacher loses access to everything at once. */
export async function membershipsOf(db: D1Database, userId: string): Promise<MembershipRow[]> {
  const res = await db
    .prepare(
      `SELECT m.tenant_id, t.name AS tenant_name, m.role
       FROM memberships m JOIN tenants t ON t.id = m.tenant_id
       WHERE m.user_id = ? AND t.status = 'active' ORDER BY m.created_at`,
    )
    .bind(userId)
    .all<MembershipRow>();
  return res.results;
}

export async function tenantIsActive(db: D1Database, tenantId: string): Promise<boolean> {
  const row = await db
    .prepare("SELECT status FROM tenants WHERE id = ?")
    .bind(tenantId)
    .first<{ status: string }>();
  return row?.status === "active";
}
