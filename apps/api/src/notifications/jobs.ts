import type { Env } from "../env";
import { getEmailProvider } from "../email/provider";
import { appUrl } from "../lib/config";
import {
  cleanupStatements,
  emailDoneStatement,
  notifyDueSoonStatement,
  pendingEmails,
  type PendingRow,
} from "../repos/notifications";

/** How many people get an email in one run, and how many notifications one email can hold. */
const PEOPLE_PER_RUN = 12;
const PER_EMAIL = 10;
const REMIND_HOURS = 24;

/** A title or name is put on one line, so it can never start a new header in the email. */
const oneLine = (text: string) => text.replace(/\s+/g, " ").trim();

/** One email for one person, with everything that was waiting for them. */
export function digestOf(env: Env, rows: PendingRow[]): { to: string; subject: string; text: string } {
  const base = appUrl(env);
  const first = rows[0]!;
  const lines = rows.flatMap((r) => [
    `- ${oneLine(r.title)}${r.body ? ` (${oneLine(r.body)})` : ""}`,
    `  ${base}${r.link}`,
  ]);
  return {
    to: first.email,
    subject: rows.length === 1 ? oneLine(first.title) : `You have ${rows.length} updates`,
    text: [
      `Hello ${oneLine(first.name)},`,
      "",
      rows.length === 1 ? "There is something new for you:" : `There are ${rows.length} new things for you:`,
      "",
      ...lines,
      "",
      `To stop some of these emails, open ${base}/notifications and change your choices.`,
    ].join("\n"),
  };
}

/**
 * What the app does by itself, every few minutes: makes reminders for work that is due in the next day, sends the
 * emails that are waiting (one email for each person), and removes notifications older than 90 days.
 * A failed email is tried again on the next run, three times in all. Nothing is logged about the words of a mail.
 */
export async function runNotificationJobs(
  env: Env,
  now: Date = new Date(),
): Promise<{ emails: number; failed: number }> {
  const db = env.DB;
  await notifyDueSoonStatement(
    db,
    now.toISOString(),
    new Date(now.getTime() + REMIND_HOURS * 3_600_000).toISOString(),
  ).run();

  const rows = await pendingEmails(db, PEOPLE_PER_RUN, PER_EMAIL);
  const byPerson = new Map<string, PendingRow[]>();
  for (const r of rows) byPerson.set(r.user_id, [...(byPerson.get(r.user_id) ?? []), r]);

  let emails = 0;
  let failed = 0;
  if (byPerson.size > 0) {
    for (const list of byPerson.values()) {
      const ids = list.map((r) => r.id);
      try {
        // (A wrong email setting is an error for each email, so nothing is lost: they are tried again later.)
        await getEmailProvider(env).send({ kind: "notification", ...digestOf(env, list) });
        await emailDoneStatement(db, ids, true).run();
        emails++;
      } catch (err) {
        console.error(JSON.stringify({ msg: "notification email failed", err: String(err) }));
        await emailDoneStatement(db, ids, false).run();
        failed++;
      }
    }
  }

  await db.batch(cleanupStatements(db, new Date(now.getTime() - 90 * 86_400_000).toISOString()));
  return { emails, failed };
}
