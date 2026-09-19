import type { Env } from "../env";
import { cleanupStatement, notifyDueSoonStatement } from "../repos/notifications";

/** Work due in the next 24 hours is reminded about. The job runs every hour, so a reminder comes 1 to 24 hours before. */
const REMIND_HOURS = 24;

/**
 * What the app does by itself, once an hour: makes the reminders for work that is due soon (one for each person and
 * piece of work), and removes notifications older than 90 days. Nothing is sent by email.
 */
export async function runNotificationJobs(env: Env, now: Date = new Date()): Promise<void> {
  const db = env.DB;
  await notifyDueSoonStatement(
    db,
    now.toISOString(),
    new Date(now.getTime() + REMIND_HOURS * 3_600_000).toISOString(),
  ).run();
  await cleanupStatement(db, new Date(now.getTime() - 90 * 86_400_000).toISOString()).run();
}
