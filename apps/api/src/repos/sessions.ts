import { uuidv7 } from "../lib/id";
import { nowIso } from "../lib/time";

export interface SessionRow {
  id: string;
  user_id: string;
  created_at: string;
  last_seen_at: string;
  expires_at: string;
  idle_days: number;
  user_agent: string | null;
}

export const insertSession = (
  db: D1Database,
  s: {
    tokenHash: string;
    userId: string;
    expiresAt: string;
    idleDays: number;
    userAgent: string | null;
    ipHash: string;
  },
): D1PreparedStatement => {
  const now = nowIso();
  return db
    .prepare(
      `INSERT INTO sessions (id, token_hash, user_id, created_at, last_seen_at, expires_at, idle_days, user_agent, ip_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(uuidv7(), s.tokenHash, s.userId, now, now, s.expiresAt, s.idleDays, s.userAgent, s.ipHash);
};

export const findSessionByTokenHash = (db: D1Database, tokenHash: string) =>
  db
    .prepare(
      `SELECT id, user_id, created_at, last_seen_at, expires_at, idle_days, user_agent
       FROM sessions WHERE token_hash = ? AND revoked_at IS NULL`,
    )
    .bind(tokenHash)
    .first<SessionRow>();

export const touchSession = (db: D1Database, id: string) =>
  db.prepare("UPDATE sessions SET last_seen_at = ? WHERE id = ?").bind(nowIso(), id).run();

export const listSessions = (db: D1Database, userId: string) =>
  db
    .prepare(
      `SELECT id, user_id, created_at, last_seen_at, expires_at, idle_days, user_agent
       FROM sessions WHERE user_id = ? AND revoked_at IS NULL AND expires_at > ? ORDER BY last_seen_at DESC`,
    )
    .bind(userId, nowIso())
    .all<SessionRow>();

/** Signs out one session. The user id in the condition means nobody can end another person's session. */
export const revokeSession = (db: D1Database, userId: string, sessionId: string): D1PreparedStatement =>
  db
    .prepare("UPDATE sessions SET revoked_at = ? WHERE id = ? AND user_id = ? AND revoked_at IS NULL")
    .bind(nowIso(), sessionId, userId);

/** Signs out every session of a person, except one when `exceptId` is given. */
export const revokeAllSessions = (db: D1Database, userId: string, exceptId?: string): D1PreparedStatement =>
  db
    .prepare("UPDATE sessions SET revoked_at = ?1 WHERE user_id = ?2 AND revoked_at IS NULL AND id != ?3")
    .bind(nowIso(), userId, exceptId ?? "");
