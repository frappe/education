/**
 * Removing what nobody needs any more. Every statement is one DELETE with fixed text; the times come in as values.
 * Never touched here: the audit log (it can only grow), invites (they show who was ever invited), and anything of a student's.
 */

/** Sessions that ended (by time, by idling, or because the person signed out) a while ago. */
export const deleteOldSessionsStatement = (
  db: D1Database,
  cutoffIso: string,
  nowIso: string,
): D1PreparedStatement =>
  db
    .prepare(
      `DELETE FROM sessions
       WHERE expires_at < ?1
          OR (revoked_at IS NOT NULL AND revoked_at < ?1)
          OR datetime(last_seen_at, '+' || (idle_days + 1) || ' days') < datetime(?2)`,
    )
    .bind(cutoffIso, nowIso);

/** Sign in links and email confirmations that expired or were used long ago. Invites are kept. */
export const deleteOldTokensStatement = (db: D1Database, cutoffIso: string): D1PreparedStatement =>
  db
    .prepare(
      `DELETE FROM auth_tokens
       WHERE kind != 'invite' AND (expires_at < ?1 OR (used_at IS NOT NULL AND used_at < ?1) OR (revoked_at IS NOT NULL AND revoked_at < ?1))`,
    )
    .bind(cutoffIso);

/** Counters of limits whose window is long over (no window is longer than an hour). `cutoffSec` is in seconds. */
export const deleteOldCountersStatement = (db: D1Database, cutoffSec: number): D1PreparedStatement =>
  db.prepare("DELETE FROM rate_limits WHERE window_start < ?").bind(cutoffSec);

/** Emails kept for a developer to read (only in dev mode). They hold links, so they do not stay. */
export const deleteOldOutboxStatement = (db: D1Database, cutoffIso: string): D1PreparedStatement =>
  db.prepare("DELETE FROM email_outbox WHERE created_at < ?").bind(cutoffIso);
