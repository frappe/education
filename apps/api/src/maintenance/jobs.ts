import type { Env } from "../env";
import {
  deleteOldCountersStatement,
  deleteOldOutboxStatement,
  deleteOldSessionsStatement,
  deleteOldTokensStatement,
} from "../repos/maintenance";

const DAY_MS = 86_400_000;

export interface MaintenanceResult {
  sessions: number;
  tokens: number;
  counters: number;
  outbox: number;
}

/**
 * Once an hour: removes what is old, so the database does not grow for ever with things nobody reads.
 * Sessions that ended more than a week ago, sign in links older than 30 days, counters of finished windows,
 * and dev emails older than a week. Returns how many rows went from each table.
 */
export async function runMaintenance(env: Env, now: Date = new Date()): Promise<MaintenanceResult> {
  const db = env.DB;
  const iso = (days: number) => new Date(now.getTime() - days * DAY_MS).toISOString();
  const [sessions, tokens, counters, outbox] = await db.batch([
    deleteOldSessionsStatement(db, iso(7), now.toISOString()),
    deleteOldTokensStatement(db, iso(30)),
    deleteOldCountersStatement(db, Math.floor((now.getTime() - 2 * DAY_MS) / 1000)),
    deleteOldOutboxStatement(db, iso(7)),
  ]);
  return {
    sessions: sessions?.meta.changes ?? 0,
    tokens: tokens?.meta.changes ?? 0,
    counters: counters?.meta.changes ?? 0,
    outbox: outbox?.meta.changes ?? 0,
  };
}
