import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";
import { runMaintenance } from "../src/maintenance/jobs";
import { addStudent, createTeacher } from "./helpers";

const NOW = new Date("2026-10-15T12:00:00.000Z");
const ago = (days: number) => new Date(NOW.getTime() - days * 86_400_000).toISOString();
const agoSec = (days: number) => Math.floor((NOW.getTime() - days * 86_400_000) / 1000);
const run = (sql: string, ...args: unknown[]) =>
  env.DB.prepare(sql)
    .bind(...args)
    .run();
const count = async (sql: string, ...args: unknown[]) =>
  (await env.DB.prepare(sql)
    .bind(...args)
    .first<{ n: number }>())!.n;

beforeEach(async () => {
  // The job looks at the whole database, so each test starts with these tables empty of the other tests' rows.
  await run("DELETE FROM rate_limits");
  await run("DELETE FROM email_outbox");
});

async function session(
  userId: string,
  over: { expires?: string; revoked?: string | null; seen?: string; idle?: number } = {},
) {
  const id = crypto.randomUUID();
  await run(
    `INSERT INTO sessions (id, token_hash, user_id, created_at, last_seen_at, expires_at, idle_days, revoked_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`,
    id,
    `h-${id}`,
    userId,
    ago(100),
    over.seen ?? ago(0),
    over.expires ?? new Date(NOW.getTime() + 30 * 86_400_000).toISOString(),
    over.idle ?? 7,
    over.revoked ?? null,
  );
  return id;
}
const exists = async (table: string, id: string) =>
  (await count(`SELECT COUNT(*) AS n FROM ${table} WHERE id = ?`, id)) === 1;

describe("cleaning up old rows", () => {
  it("removes sessions that ended a while ago, and keeps the ones that are in use or ended only recently", async () => {
    const t = await createTeacher();
    const live = await session(t.userId);
    const endedYesterday = await session(t.userId, { expires: ago(1) });
    const ended = await session(t.userId, { expires: ago(8) });
    const signedOutLongAgo = await session(t.userId, { revoked: ago(9) });
    const signedOutJustNow = await session(t.userId, { revoked: ago(1) });
    const idleLongAgo = await session(t.userId, { seen: ago(20), idle: 7 }); // idle time (7 days) ran out 13 days ago
    const idleRecently = await session(t.userId, { seen: ago(8), idle: 7 }); // ran out yesterday
    const result = await runMaintenance(env, NOW);
    expect(result.sessions).toBe(3);
    for (const id of [live, endedYesterday, signedOutJustNow, idleRecently])
      expect(await exists("sessions", id), id).toBe(true);
    for (const id of [ended, signedOutLongAgo, idleLongAgo])
      expect(await exists("sessions", id), id).toBe(false);
    // The sessions of the teacher who is signed in right now (from the test setup) are not touched.
    expect(
      await count(
        "SELECT COUNT(*) AS n FROM sessions WHERE user_id = ? AND id NOT IN (?, ?, ?, ?)",
        t.userId,
        live,
        endedYesterday,
        signedOutJustNow,
        idleRecently,
      ),
    ).toBeGreaterThanOrEqual(1);
  });

  it("removes old sign in links but never an invite", async () => {
    const t = await createTeacher();
    const kid = await addStudent(t, { name: "Bao", invite: true });
    const token = (kind: string, over: { expires?: string; used?: string | null }) => {
      const id = crypto.randomUUID();
      return run(
        `INSERT INTO auth_tokens (id, kind, token_hash, email, created_at, expires_at, used_at) VALUES (?1, ?2, ?3, 'x@example.com', ?4, ?5, ?6)`,
        id,
        kind,
        `t-${id}`,
        ago(90),
        over.expires ?? ago(-1),
        over.used ?? null,
      ).then(() => id);
    };
    const oldLink = await token("magic_link", { expires: ago(31) });
    const oldUsed = await token("verify_email", { used: ago(40), expires: ago(-1) });
    const freshLink = await token("magic_link", { expires: ago(2) });
    const waiting = await token("magic_link", { expires: ago(-1) });
    const oldInvite = await token("invite", { expires: ago(60), used: ago(50) });
    const invitesBefore = await count(
      "SELECT COUNT(*) AS n FROM auth_tokens WHERE kind = 'invite' AND student_id = ?",
      kid.id,
    );
    const result = await runMaintenance(env, NOW);
    expect(result.tokens).toBe(2);
    expect(await exists("auth_tokens", oldLink)).toBe(false);
    expect(await exists("auth_tokens", oldUsed)).toBe(false);
    for (const id of [freshLink, waiting, oldInvite]) expect(await exists("auth_tokens", id), id).toBe(true);
    expect(
      await count("SELECT COUNT(*) AS n FROM auth_tokens WHERE kind = 'invite' AND student_id = ?", kid.id),
    ).toBe(invitesBefore);
  });

  it("removes counters whose window is long over, and keeps the others", async () => {
    await run(
      "INSERT INTO rate_limits (key, count, window_start) VALUES ('old', 3, ?), ('recent', 3, ?), ('now', 1, ?)",
      agoSec(3),
      agoSec(1),
      agoSec(0),
    );
    const result = await runMaintenance(env, NOW);
    expect(result.counters).toBe(1);
    expect(await count("SELECT COUNT(*) AS n FROM rate_limits WHERE key = 'old'")).toBe(0);
    expect(await count("SELECT COUNT(*) AS n FROM rate_limits WHERE key IN ('recent', 'now')")).toBe(2);
  });

  it("removes test emails older than a week", async () => {
    await run(
      `INSERT INTO email_outbox (id, kind, to_email, subject, body_text, status, created_at)
       VALUES ('o1', 'invite', 'a@example.com', 's', 'link', 'logged', ?1), ('o2', 'invite', 'b@example.com', 's', 'link', 'logged', ?2)`,
      ago(8),
      ago(1),
    );
    expect((await runMaintenance(env, NOW)).outbox).toBe(1);
    expect(await count("SELECT COUNT(*) AS n FROM email_outbox")).toBe(1);
  });

  it("never touches the audit log, and can run again and again", async () => {
    const before = await count("SELECT COUNT(*) AS n FROM audit_log");
    await runMaintenance(env, NOW);
    const second = await runMaintenance(env, NOW);
    expect(second).toEqual({ sessions: 0, tokens: 0, counters: 0, outbox: 0 });
    expect(await count("SELECT COUNT(*) AS n FROM audit_log")).toBe(before);
  });
});
