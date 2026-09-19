import { nowSec } from "../lib/time";

export interface RateResult {
  allowed: boolean;
  count: number;
  retryAfterSec: number;
}

/**
 * Counts one attempt for `key` inside a fixed window and says if it is still allowed.
 * One atomic statement, so two requests at the same moment cannot both slip under the limit.
 */
export async function hit(
  db: D1Database,
  key: string,
  limit: number,
  windowSec: number,
): Promise<RateResult> {
  const now = nowSec();
  const row = await db
    .prepare(
      `INSERT INTO rate_limits (key, count, window_start) VALUES (?1, 1, ?2)
       ON CONFLICT (key) DO UPDATE SET
         count = CASE WHEN rate_limits.window_start + ?3 <= ?2 THEN 1 ELSE rate_limits.count + 1 END,
         window_start = CASE WHEN rate_limits.window_start + ?3 <= ?2 THEN ?2 ELSE rate_limits.window_start END
       RETURNING count, window_start`,
    )
    .bind(key, now, windowSec)
    .first<{ count: number; window_start: number }>();
  const count = row?.count ?? 1;
  const start = row?.window_start ?? now;
  return { allowed: count <= limit, count, retryAfterSec: Math.max(0, start + windowSec - now) };
}

/** Looks at the counter without counting. */
export async function peek(
  db: D1Database,
  key: string,
  limit: number,
  windowSec: number,
): Promise<RateResult> {
  const now = nowSec();
  const row = await db
    .prepare("SELECT count, window_start FROM rate_limits WHERE key = ?")
    .bind(key)
    .first<{ count: number; window_start: number }>();
  if (!row || row.window_start + windowSec <= now) return { allowed: true, count: 0, retryAfterSec: 0 };
  return { allowed: row.count < limit, count: row.count, retryAfterSec: row.window_start + windowSec - now };
}

export async function reset(db: D1Database, key: string): Promise<void> {
  await db.prepare("DELETE FROM rate_limits WHERE key = ?").bind(key).run();
}
