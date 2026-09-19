import { randomToken, sha256Hex } from "../lib/crypto";
import { uuidv7 } from "../lib/id";
import { nowIso, plusMinutes } from "../lib/time";

export type TokenKind = "verify_email" | "password_reset" | "magic_link" | "invite";

export interface TokenRow {
  id: string;
  email: string;
  user_id: string | null;
  tenant_id: string | null;
  student_id: string | null;
}

/** Makes a new one-time token. The raw token goes into the email; only its hash is saved. */
export async function newToken(
  db: D1Database,
  t: {
    kind: TokenKind;
    email: string;
    ttlMinutes: number;
    userId?: string;
    tenantId?: string;
    studentId?: string;
  },
): Promise<{ token: string; statement: D1PreparedStatement }> {
  const token = randomToken();
  const statement = db
    .prepare(
      `INSERT INTO auth_tokens (id, kind, token_hash, email, user_id, tenant_id, student_id, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      uuidv7(),
      t.kind,
      await sha256Hex(token),
      t.email,
      t.userId ?? null,
      t.tenantId ?? null,
      t.studentId ?? null,
      nowIso(),
      plusMinutes(t.ttlMinutes),
    );
  return { token, statement };
}

/** Checks a token without using it up. */
export async function isTokenValid(db: D1Database, token: string, kind: TokenKind): Promise<boolean> {
  const row = await db
    .prepare(
      `SELECT id FROM auth_tokens
       WHERE token_hash = ? AND kind = ? AND used_at IS NULL AND revoked_at IS NULL AND expires_at > ?`,
    )
    .bind(await sha256Hex(token), kind, nowIso())
    .first();
  return row !== null;
}

/**
 * Uses a token up. One statement, so two requests with the same link cannot both win:
 * the second finds used_at already set and gets nothing back.
 */
export async function consumeToken(db: D1Database, token: string, kind: TokenKind): Promise<TokenRow | null> {
  return db
    .prepare(
      `UPDATE auth_tokens SET used_at = ?1
       WHERE token_hash = ?2 AND kind = ?3 AND used_at IS NULL AND revoked_at IS NULL AND expires_at > ?1
       RETURNING id, email, user_id, tenant_id, student_id`,
    )
    .bind(nowIso(), await sha256Hex(token), kind)
    .first<TokenRow>();
}

export const revokeInvites = (db: D1Database, studentId: string): D1PreparedStatement =>
  db
    .prepare(
      `UPDATE auth_tokens SET revoked_at = ? WHERE student_id = ? AND kind = 'invite'
       AND used_at IS NULL AND revoked_at IS NULL`,
    )
    .bind(nowIso(), studentId);

export const revokeUserTokens = (db: D1Database, userId: string, kind: TokenKind): D1PreparedStatement =>
  db
    .prepare(
      "UPDATE auth_tokens SET revoked_at = ? WHERE user_id = ? AND kind = ? AND used_at IS NULL AND revoked_at IS NULL",
    )
    .bind(nowIso(), userId, kind);

/** Invites a tenant created in the last 24 hours, for the daily limit. */
export async function invitesInLastDay(db: D1Database, tenantId: string): Promise<number> {
  const since = new Date(Date.now() - 24 * 3600_000).toISOString();
  const row = await db
    .prepare(
      "SELECT COUNT(*) AS n FROM auth_tokens WHERE tenant_id = ? AND kind = 'invite' AND created_at > ?",
    )
    .bind(tenantId, since)
    .first<{ n: number }>();
  return row?.n ?? 0;
}
