import { uuidv7 } from "../lib/id";
import { nowIso } from "../lib/time";
import type { UserRow } from "./users";

/** The person linked to this Google account, if any. */
export const findUserByGoogle = (db: D1Database, subject: string) =>
  db
    .prepare(
      `SELECT u.id, u.email, u.name, u.password_hash, u.email_verified_at, u.disabled_at
       FROM identities i JOIN users u ON u.id = i.user_id
       WHERE i.provider = 'google' AND i.subject = ?`,
    )
    .bind(subject)
    .first<UserRow>();

export async function hasGoogle(db: D1Database, userId: string): Promise<boolean> {
  const row = await db
    .prepare("SELECT 1 AS x FROM identities WHERE user_id = ? AND provider = 'google'")
    .bind(userId)
    .first();
  return row !== null;
}

export const linkGoogle = (db: D1Database, userId: string, subject: string): D1PreparedStatement =>
  db
    .prepare(
      "INSERT INTO identities (id, user_id, provider, subject, created_at) VALUES (?, ?, 'google', ?, ?)",
    )
    .bind(uuidv7(), userId, subject, nowIso());
