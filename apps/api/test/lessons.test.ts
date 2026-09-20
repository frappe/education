import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";
import { extendOpenSeries } from "../src/lessons/jobs";
import { addStudent, call, createCourse, createTeacher, type Person } from "./helpers";

const PAST = "2020-01-06"; // a Monday, long ago: attendance can be taken
const FUTURE = "2099-01-05";

const plusDays = (date: string, days: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

/** `weeks: 4` is a short way to say "every week, four lessons in all". */
const body = (over: Record<string, unknown> = {}) => {
  const { weeks, ...rest } = over as { weeks?: number } & Record<string, unknown>;
  const date = (rest.date as string | undefined) ?? PAST;
  return {
    title: "Unit 1",
    date: PAST,
    startTime: "18:30",
    durationMinutes: 90,
    place: "Room 2",
    onlineUrl: null,
    ...(weeks !== undefined && weeks > 1
      ? { repeat: "weekly", repeatUntil: plusDays(date, 7 * (weeks - 1)) }
      : {}),
    ...rest,
  };
};

const create = (t: Person, courseId: string, over: Record<string, unknown> = {}) =>
  call(`/api/courses/${courseId}/lessons`, { method: "POST", cookie: t.cookie, body: body(over) });

type Lesson = {
  id: string;
  courseId: string;
  date: string;
  startTime: string;
  endTime: string;
  startsAt: string;
  status: string;
  version: number;
  seriesId: string | null;
  title: string;
  place: string;
  onlineUrl: string | null;
  courseName: string;
};

async function lessonsOf(t: Person, over: Record<string, unknown> = {}) {
  const course = await createCourse(t);
  const res = await create(t, course.id, over);
  expect(res.status, JSON.stringify(res.json)).toBe(201);
  return { course, lessons: res.json.lessons as Lesson[] };
}

const list = async (t: Person, courseId: string) =>
  (await call(`/api/courses/${courseId}/lessons`, { cookie: t.cookie })).json.lessons as Lesson[];

const update = (t: Person, l: Lesson, over: Record<string, unknown> = {}) =>
  call(`/api/lessons/${l.id}`, {
    method: "PUT",
    cookie: t.cookie,
    body: {
      title: l.title,
      date: l.date,
      startTime: l.startTime,
      durationMinutes: 90,
      place: l.place,
      onlineUrl: l.onlineUrl,
      version: l.version,
      scope: "this",
      ...over,
    },
  });

const cancel = (t: Person, id: string, scope = "this") =>
  call(`/api/lessons/${id}/cancel`, { method: "POST", cookie: t.cookie, body: { scope } });
const restore = (t: Person, id: string) =>
  call(`/api/lessons/${id}/restore`, { method: "POST", cookie: t.cookie, body: {} });

const enroll = (t: Person, courseId: string, studentIds: string[]) =>
  call(`/api/courses/${courseId}/students`, {
    method: "POST",
    cookie: t.cookie,
    body: { studentIds, customPrice: null },
  });
const sheet = (t: Person, lessonId: string) =>
  call(`/api/lessons/${lessonId}/attendance`, { cookie: t.cookie });
const mark = (t: Person, lessonId: string, records: { studentId: string; status: string }[]) =>
  call(`/api/lessons/${lessonId}/attendance`, { method: "PUT", cookie: t.cookie, body: { records } });

/** Students who joined before the old lesson took place, so they start as "attended". */
const backdate = (tenantId: string) =>
  env.DB.prepare("UPDATE enrollments SET enrolled_at = '2019-01-01T00:00:00.000Z' WHERE tenant_id = ?")
    .bind(tenantId)
    .run();

const count = async (sql: string, ...args: unknown[]) =>
  (await env.DB.prepare(sql)
    .bind(...args)
    .first<{ n: number }>())!.n;

describe("create lessons", () => {
  it("makes one lesson, with the time shown in the teacher's time zone", async () => {
    const t = await createTeacher();
    const { course, lessons } = await lessonsOf(t);
    expect(lessons).toHaveLength(1);
    expect(lessons[0]).toMatchObject({
      courseName: course.name,
      title: "Unit 1",
      date: PAST,
      startTime: "18:30",
      endTime: "20:00",
      startsAt: "2020-01-06T11:30:00.000Z", // 7 hours behind Ho Chi Minh
      status: "scheduled",
      seriesId: null,
      place: "Room 2",
      version: 1,
    });
  });

  it("repeats every week at the same clock time, sharing one series", async () => {
    const t = await createTeacher();
    const { lessons } = await lessonsOf(t, { date: "2026-10-26", weeks: 4 });
    expect(lessons.map((l) => l.date)).toEqual(["2026-10-26", "2026-11-02", "2026-11-09", "2026-11-16"]);
    expect(new Set(lessons.map((l) => l.startTime))).toEqual(new Set(["18:30"]));
    expect(new Set(lessons.map((l) => l.seriesId)).size).toBe(1);
    expect(lessons[0]!.seriesId).toMatch(/\w/);
  });

  it("keeps the clock time when the teacher's time zone changes to summer time", async () => {
    const t = await createTeacher();
    await env.DB.prepare("UPDATE tenants SET timezone = 'America/New_York' WHERE id = ?")
      .bind(t.tenantId)
      .run();
    const { lessons } = await lessonsOf(t, { date: "2026-03-02", startTime: "18:00", weeks: 3 });
    expect(lessons.map((l) => [l.date, l.startTime])).toEqual([
      ["2026-03-02", "18:00"],
      ["2026-03-09", "18:00"],
      ["2026-03-16", "18:00"],
    ]);
    // New York went to summer time on 2026-03-08, so the same 18:00 is one hour earlier in UTC.
    expect(lessons[0]!.startsAt).toBe("2026-03-02T23:00:00.000Z");
    expect(lessons[1]!.startsAt).toBe("2026-03-09T22:00:00.000Z");
  });

  it("can make a whole year (52 weeks) in one request", async () => {
    const t = await createTeacher();
    const { lessons } = await lessonsOf(t, { weeks: 52 });
    expect(lessons).toHaveLength(52);
    expect(lessons.at(-1)!.date).toBe("2020-12-28"); // 51 weeks after the first
  });

  it("accepts an online link that starts with http or https", async () => {
    const t = await createTeacher();
    for (const url of ["https://meet.example.com/abc", "http://meet.example.com/abc"]) {
      const { lessons } = await lessonsOf(t, { onlineUrl: url });
      expect(lessons[0]!.onlineUrl).toBe(url);
    }
  });

  it("refuses bad input and says which field", async () => {
    const t = await createTeacher();
    const course = await createCourse(t);
    const bad: [string, Record<string, unknown>, string][] = [
      ["time 25:00", { startTime: "25:00" }, "startTime"],
      ["time without a leading zero", { startTime: "6:30" }, "startTime"],
      ["seconds in the time", { startTime: "18:30:00" }, "startTime"],
      ["a date that does not exist", { date: "2026-02-30" }, "date"],
      ["a date in another format", { date: "05/10/2026" }, "date"],
      ["10 minutes", { durationMinutes: 10 }, "durationMinutes"],
      ["more than 8 hours", { durationMinutes: 481 }, "durationMinutes"],
      ["a duration with decimals", { durationMinutes: 45.5 }, "durationMinutes"],
      ["a repeat that does not exist", { repeat: "daily" }, "repeat"],
      ["an end date before the first lesson", { repeat: "weekly", repeatUntil: "2019-12-30" }, "repeatUntil"],
      ["an end date that does not exist", { repeat: "weekly", repeatUntil: "2020-02-30" }, "repeatUntil"],
      ["more than 104 lessons", { repeat: "weekly", repeatUntil: "2030-01-01" }, "repeatUntil"],
      ["a repeat with no end that starts years ago", { repeat: "weekly" }, "date"],
      ["a link that runs code", { onlineUrl: "javascript:alert(1)" }, "onlineUrl"],
      ["a data link", { onlineUrl: "data:text/html,hi" }, "onlineUrl"],
      ["a file link", { onlineUrl: "file:///etc/passwd" }, "onlineUrl"],
      ["an ftp link", { onlineUrl: "ftp://x.example/a" }, "onlineUrl"],
      ["a link with a password", { onlineUrl: "https://user:pass@x.example/" }, "onlineUrl"],
      ["text that is not a link", { onlineUrl: "meet.example.com" }, "onlineUrl"],
      ["a link that is too long", { onlineUrl: `https://x.example/${"a".repeat(2100)}` }, "onlineUrl"],
      ["a title that is too long", { title: "x".repeat(101) }, "title"],
      ["a place that is too long", { place: "x".repeat(201) }, "place"],
    ];
    for (const [label, over, field] of bad) {
      const res = await create(t, course.id, over);
      expect(res.status, label).toBe(400);
      expect(res.json.error.fields, label).toHaveProperty(field);
    }
    expect(await list(t, course.id)).toHaveLength(0);
  });

  it("refuses a request with no body or with the tenant in it", async () => {
    const t = await createTeacher();
    const course = await createCourse(t);
    const empty = await call(`/api/courses/${course.id}/lessons`, {
      method: "POST",
      cookie: t.cookie,
      body: {},
    });
    expect(empty.status).toBe(400);
    // A tenant id in the body is simply ignored: the lesson still lands in the teacher's own tenant.
    const other = await createTeacher();
    const res = await create(t, course.id, { tenantId: other.tenantId });
    expect(res.status).toBe(201);
    expect(await count("SELECT COUNT(*) AS n FROM lessons WHERE tenant_id = ?", other.tenantId)).toBe(0);
  });

  it("stops at 500 lessons in a course and creates none of a batch that does not fit", async () => {
    const t = await createTeacher();
    const course = await createCourse(t);
    await env.DB.prepare(
      `WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 480)
       INSERT INTO lessons (id, tenant_id, course_id, starts_at, ends_at, created_at, updated_at)
       SELECT 'bulk-' || i, ?1, ?2, '2030-01-01T10:00:00.000Z', '2030-01-01T11:00:00.000Z', 'x', 'x' FROM n`,
    )
      .bind(t.tenantId, course.id)
      .run();
    const tooMany = await create(t, course.id, { weeks: 21 });
    expect(tooMany.status).toBe(409);
    expect(await count("SELECT COUNT(*) AS n FROM lessons WHERE course_id = ?", course.id)).toBe(480);
    expect((await create(t, course.id, { weeks: 20 })).status).toBe(201);
    expect(await count("SELECT COUNT(*) AS n FROM lessons WHERE course_id = ?", course.id)).toBe(500);
    expect((await create(t, course.id)).status).toBe(409);
  });

  it("refuses an archived course", async () => {
    const t = await createTeacher();
    const course = await createCourse(t);
    await call(`/api/courses/${course.id}/archive`, { method: "POST", cookie: t.cookie, body: {} });
    const res = await create(t, course.id);
    expect(res.status).toBe(409);
    expect(res.json.error.message).toMatch(/archived/);
  });

  it("does not let a teacher add lessons to another teacher's course", async () => {
    const a = await createTeacher();
    const b = await createTeacher();
    const course = await createCourse(a);
    const res = await create(b, course.id);
    expect(res.status).toBe(404);
    expect(res.json.error.code).toBe("NOT_FOUND");
    expect(await count("SELECT COUNT(*) AS n FROM lessons WHERE course_id = ?", course.id)).toBe(0);
    expect((await create(b, "made-up-id")).status).toBe(404); // same answer as for a missing course
  });

  it("writes to the audit log", async () => {
    const t = await createTeacher();
    const { course } = await lessonsOf(t, { weeks: 3 });
    const row = await env.DB.prepare(
      "SELECT meta FROM audit_log WHERE tenant_id = ? AND action = 'lesson.created' AND target_id = ?",
    )
      .bind(t.tenantId, course.id)
      .first<{ meta: string }>();
    expect(JSON.parse(row!.meta)).toEqual({ count: 3 });
  });
});

describe("read lessons and the calendar", () => {
  it("lists the lessons of a course in time order", async () => {
    const t = await createTeacher();
    const course = await createCourse(t);
    await create(t, course.id, { date: "2026-10-12", title: "B" });
    await create(t, course.id, { date: "2026-10-05", title: "A" });
    expect((await list(t, course.id)).map((l) => l.title)).toEqual(["A", "B"]);
  });

  it("shows only the lessons of the teacher's own courses", async () => {
    const a = await createTeacher();
    const b = await createTeacher();
    const course = await createCourse(a);
    await create(a, course.id);
    expect((await call(`/api/courses/${course.id}/lessons`, { cookie: b.cookie })).status).toBe(404);
    const cal = await call("/api/lessons?from=2019-12-01&to=2020-02-28", { cookie: b.cookie });
    expect(cal.json.lessons).toEqual([]);
  });

  it("calendar: takes whole local days, including the last evening and excluding the next night", async () => {
    const t = await createTeacher();
    const course = await createCourse(t);
    // Local times: 00:00 on 2 Feb (in), 23:30 on 8 Feb (in), 00:30 on 9 Feb (out), 23:30 on 1 Feb (out)
    for (const [date, startTime] of [
      ["2026-02-02", "00:00"],
      ["2026-02-08", "23:30"],
      ["2026-02-09", "00:30"],
      ["2026-02-01", "23:30"],
    ] as const) {
      await create(t, course.id, { date, startTime, durationMinutes: 30 });
    }
    const res = await call("/api/lessons?from=2026-02-02&to=2026-02-08", { cookie: t.cookie });
    expect(res.status).toBe(200);
    expect(res.json.lessons.map((l: Lesson) => `${l.date} ${l.startTime}`)).toEqual([
      "2026-02-02 00:00",
      "2026-02-08 23:30",
    ]);
  });

  it("calendar: shows lessons of all courses, with the course name", async () => {
    const t = await createTeacher();
    const c1 = await createCourse(t, { name: "English A1" });
    const c2 = await createCourse(t, { name: "English B1" });
    await create(t, c1.id, { date: "2026-02-02" });
    await create(t, c2.id, { date: "2026-02-03" });
    const res = await call("/api/lessons?from=2026-02-01&to=2026-02-07", { cookie: t.cookie });
    expect(res.json.lessons.map((l: Lesson) => l.courseName)).toEqual(["English A1", "English B1"]);
  });

  it("calendar: names the students who are in the course now, by name, and leaves out students who left or were archived", async () => {
    const t = await createTeacher();
    const c1 = await createCourse(t, { name: "English A1" });
    const c2 = await createCourse(t, { name: "English B1" });
    await create(t, c1.id, { date: "2026-02-02" });
    await create(t, c2.id, { date: "2026-02-03" });
    const [bao, anh, gone, archived, other] = [
      await addStudent(t, { name: "Bao" }),
      await addStudent(t, { name: "anh" }),
      await addStudent(t, { name: "Left" }),
      await addStudent(t, { name: "Archived" }),
      await addStudent(t, { name: "Only B1" }),
    ];
    await enroll(t, c1.id, [bao.id, anh.id, gone.id, archived.id]);
    await enroll(t, c2.id, [other.id]);
    const drop = await call(`/api/courses/${c1.id}/students/${gone.id}`, {
      method: "PUT",
      cookie: t.cookie,
      body: { status: "dropped", customPrice: null },
    });
    expect(drop.status, JSON.stringify(drop.json)).toBe(200);
    await call(`/api/students/${archived.id}/archive`, { method: "POST", cookie: t.cookie });
    const res = await call("/api/lessons?from=2026-02-01&to=2026-02-07", { cookie: t.cookie });
    expect(res.json.lessons.map((l: Lesson & { students: string[] }) => [l.courseName, l.students])).toEqual([
      ["English A1", ["anh", "Bao"]],
      ["English B1", ["Only B1"]],
    ]);
    // A lesson of a course with nobody in it has an empty list, and another teacher sees none of these names.
    const empty = await createCourse(t, { name: "Empty" });
    await create(t, empty.id, { date: "2026-02-04" });
    const again = await call("/api/lessons?from=2026-02-04&to=2026-02-04", { cookie: t.cookie });
    expect(again.json.lessons[0].students).toEqual([]);
    const b = await createTeacher();
    expect(
      (await call("/api/lessons?from=2026-02-01&to=2026-02-07", { cookie: b.cookie })).json.lessons,
    ).toEqual([]);
  });

  it("calendar: refuses a range that is missing, backwards, not real, or longer than 92 days", async () => {
    const t = await createTeacher();
    for (const q of [
      "",
      "?from=2026-02-01",
      "?from=2026-02-08&to=2026-02-01",
      "?from=2026-02-30&to=2026-03-05",
      "?from=2026-02-01&to=2026-06-01",
      "?from=tomorrow&to=2026-03-05",
    ]) {
      const res = await call(`/api/lessons${q}`, { cookie: t.cookie });
      expect(res.status, q).toBe(400);
    }
    expect((await call("/api/lessons?from=2026-01-01&to=2026-04-03", { cookie: t.cookie })).status).toBe(200); // 92 days
    expect((await call("/api/lessons?from=2026-01-01&to=2026-04-04", { cookie: t.cookie })).status).toBe(400);
  });

  it("gets one lesson, and answers 'not found' for another teacher's lesson", async () => {
    const a = await createTeacher();
    const b = await createTeacher();
    const { lessons } = await lessonsOf(a);
    const own = await call(`/api/lessons/${lessons[0]!.id}`, { cookie: a.cookie });
    expect(own.json.lesson.id).toBe(lessons[0]!.id);
    const other = await call(`/api/lessons/${lessons[0]!.id}`, { cookie: b.cookie });
    const missing = await call("/api/lessons/made-up-id", { cookie: b.cookie });
    expect(other.status).toBe(404);
    expect(other.json.error.code).toBe(missing.json.error.code);
  });
});

describe("change lessons", () => {
  it("changes only this lesson", async () => {
    const t = await createTeacher();
    const { course, lessons } = await lessonsOf(t, { date: "2026-10-05", weeks: 3 });
    const res = await update(t, lessons[1]!, {
      title: "Moved",
      date: "2026-11-11",
      startTime: "09:00",
      durationMinutes: 60,
      place: "Room 9",
      onlineUrl: "https://meet.example.com/x",
    });
    expect(res.status).toBe(200);
    expect(res.json.lessons).toHaveLength(1);
    expect(res.json.lessons[0]).toMatchObject({
      title: "Moved",
      date: "2026-11-11",
      startTime: "09:00",
      endTime: "10:00",
      place: "Room 9",
      version: 2,
    });
    const after = await list(t, course.id);
    expect(after.map((l) => [l.date, l.startTime, l.version])).toEqual([
      ["2026-10-05", "18:30", 1],
      ["2026-10-19", "18:30", 1],
      ["2026-11-11", "09:00", 2],
    ]);
  });

  it("changes this lesson and the next ones, and moves them all by the same number of days", async () => {
    const t = await createTeacher();
    const { course, lessons } = await lessonsOf(t, { date: "2026-10-05", weeks: 4 });
    // Move the second lesson from Monday 12 Oct to Tuesday 13 Oct, at 19:00.
    const res = await update(t, lessons[1]!, {
      date: "2026-10-13",
      startTime: "19:00",
      scope: "following",
      title: "New",
    });
    expect(res.status).toBe(200);
    expect(res.json.lessons).toHaveLength(3);
    const after = await list(t, course.id);
    expect(after.map((l) => [l.date, l.startTime, l.title])).toEqual([
      ["2026-10-05", "18:30", "Unit 1"], // before this lesson: untouched
      ["2026-10-13", "19:00", "New"],
      ["2026-10-20", "19:00", "New"],
      ["2026-10-27", "19:00", "New"],
    ]);
  });

  it("'this and the next ones' leaves alone later lessons that are held or cancelled", async () => {
    const t = await createTeacher();
    const { course, lessons } = await lessonsOf(t, { date: "2026-10-05", weeks: 4 });
    await cancel(t, lessons[2]!.id);
    await env.DB.prepare("UPDATE lessons SET status = 'held' WHERE id = ?").bind(lessons[3]!.id).run();
    const res = await update(t, lessons[0]!, { title: "Changed", scope: "following" });
    expect(res.json.lessons).toHaveLength(2);
    const after = await list(t, course.id);
    expect(after.map((l) => [l.title, l.status])).toEqual([
      ["Changed", "scheduled"],
      ["Changed", "scheduled"],
      ["Unit 1", "cancelled"],
      ["Unit 1", "held"],
    ]);
  });

  it("'the next ones' on a single lesson just changes that lesson", async () => {
    const t = await createTeacher();
    const { lessons } = await lessonsOf(t);
    const res = await update(t, lessons[0]!, { title: "Solo", scope: "following" });
    expect(res.status).toBe(200);
    expect(res.json.lessons.map((l: Lesson) => l.title)).toEqual(["Solo"]);
  });

  it("refuses a save made on an old version, and changes nothing (not even the later lessons)", async () => {
    const t = await createTeacher();
    const { course, lessons } = await lessonsOf(t, { weeks: 3 });
    expect((await update(t, lessons[0]!, { title: "First" })).status).toBe(200);
    const stale = await update(t, lessons[0]!, { title: "Second", scope: "following" }); // version 1 is old now
    expect(stale.status).toBe(409);
    expect(stale.json.error.code).toBe("CONFLICT");
    expect((await list(t, course.id)).map((l) => l.title)).toEqual(["First", "Unit 1", "Unit 1"]);
  });

  it("two saves at the same moment: one wins, one is refused", async () => {
    const t = await createTeacher();
    const { lessons } = await lessonsOf(t);
    const results = await Promise.all([
      update(t, lessons[0]!, { title: "One" }),
      update(t, lessons[0]!, { title: "Two" }),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
  });

  it("does not change a lesson that was held or cancelled", async () => {
    const t = await createTeacher();
    const { lessons } = await lessonsOf(t, { weeks: 2 });
    await env.DB.prepare("UPDATE lessons SET status = 'held' WHERE id = ?").bind(lessons[0]!.id).run();
    await cancel(t, lessons[1]!.id);
    for (const l of [lessons[0]!, { ...lessons[1]!, version: 2 }]) {
      const res = await update(t, l, { title: "No" });
      expect(res.status).toBe(409);
    }
  });

  it("validates like creating does", async () => {
    const t = await createTeacher();
    const { lessons } = await lessonsOf(t);
    for (const over of [
      { startTime: "99:99" },
      { durationMinutes: 5 },
      { onlineUrl: "javascript:1" },
      { date: "nope" },
    ]) {
      expect((await update(t, lessons[0]!, over)).status).toBe(400);
    }
    const noVersion = await call(`/api/lessons/${lessons[0]!.id}`, {
      method: "PUT",
      cookie: t.cookie,
      body: { date: PAST, startTime: "18:00", durationMinutes: 60 },
    });
    expect(noVersion.status).toBe(400);
  });

  it("does not let another teacher change or cancel it, and changes nothing", async () => {
    const a = await createTeacher();
    const b = await createTeacher();
    const { course, lessons } = await lessonsOf(a, { weeks: 2 });
    expect((await update(b, lessons[0]!, { title: "Hacked", scope: "following" })).status).toBe(404);
    expect((await cancel(b, lessons[0]!.id, "following")).status).toBe(404);
    expect((await restore(b, lessons[0]!.id)).status).toBe(404);
    expect((await list(a, course.id)).map((l) => [l.title, l.status])).toEqual([
      ["Unit 1", "scheduled"],
      ["Unit 1", "scheduled"],
    ]);
  });
});

describe("cancel and restore", () => {
  it("cancels one lesson", async () => {
    const t = await createTeacher();
    const { course, lessons } = await lessonsOf(t, { weeks: 3 });
    const res = await cancel(t, lessons[1]!.id);
    expect(res.status).toBe(200);
    expect(res.json.lessons.map((l: Lesson) => l.status)).toEqual(["cancelled"]);
    expect((await list(t, course.id)).map((l) => l.status)).toEqual(["scheduled", "cancelled", "scheduled"]);
  });

  it("cancels this lesson and the next ones only", async () => {
    const t = await createTeacher();
    const { course, lessons } = await lessonsOf(t, { weeks: 4 });
    const res = await cancel(t, lessons[1]!.id, "following");
    expect(res.json.lessons).toHaveLength(3);
    expect((await list(t, course.id)).map((l) => l.status)).toEqual([
      "scheduled",
      "cancelled",
      "cancelled",
      "cancelled",
    ]);
  });

  it("does not cancel a lesson that was held, or one that is already cancelled", async () => {
    const t = await createTeacher();
    const { lessons } = await lessonsOf(t, { weeks: 2 });
    await env.DB.prepare("UPDATE lessons SET status = 'held' WHERE id = ?").bind(lessons[0]!.id).run();
    expect((await cancel(t, lessons[0]!.id)).status).toBe(409);
    expect((await cancel(t, lessons[1]!.id)).status).toBe(200);
    expect((await cancel(t, lessons[1]!.id)).status).toBe(409);
  });

  it("restores a cancelled lesson, and only that", async () => {
    const t = await createTeacher();
    const { lessons } = await lessonsOf(t, { weeks: 2 });
    expect((await restore(t, lessons[0]!.id)).status).toBe(409); // not cancelled
    await cancel(t, lessons[0]!.id);
    const res = await restore(t, lessons[0]!.id);
    expect(res.status).toBe(200);
    expect(res.json.lesson).toMatchObject({ status: "scheduled", version: 3 });
  });

  it("writes to the audit log", async () => {
    const t = await createTeacher();
    const { lessons } = await lessonsOf(t, { weeks: 3 });
    await cancel(t, lessons[0]!.id, "following");
    await restore(t, lessons[0]!.id);
    const rows = await env.DB.prepare(
      "SELECT action, meta FROM audit_log WHERE tenant_id = ? AND action LIKE 'lesson.%' ORDER BY at, id",
    )
      .bind(t.tenantId)
      .all<{ action: string; meta: string | null }>();
    expect(rows.results.map((r) => r.action)).toEqual([
      "lesson.created",
      "lesson.cancelled",
      "lesson.restored",
    ]);
    expect(JSON.parse(rows.results[1]!.meta!)).toEqual({ count: 3, scope: "following" });
  });
});

describe("attendance sheet", () => {
  it("lists the students of the course, all starting as attended, by name", async () => {
    const t = await createTeacher();
    const { course, lessons } = await lessonsOf(t);
    const [b, a] = [await addStudent(t, { name: "Bao" }), await addStudent(t, { name: "anh" })];
    await addStudent(t, { name: "Not in the course" });
    await enroll(t, course.id, [b.id, a.id]);
    await backdate(t.tenantId);
    const res = await sheet(t, lessons[0]!.id);
    expect(res.status).toBe(200);
    expect(res.json.lesson.id).toBe(lessons[0]!.id);
    expect(res.json.students).toEqual([
      { studentId: a.id, name: "anh", status: "attended", saved: false, inCourse: true, joinedAfter: false },
      { studentId: b.id, name: "Bao", status: "attended", saved: false, inCourse: true, joinedAfter: false },
    ]);
  });

  it("starts as absent for a student who joined after the lesson was over", async () => {
    const t = await createTeacher();
    const { course, lessons } = await lessonsOf(t); // in 2020: the student joins "now", long after
    const s = await addStudent(t);
    await enroll(t, course.id, [s.id]);
    const res = await sheet(t, lessons[0]!.id);
    expect(res.json.students[0]).toMatchObject({ status: "absent", saved: false, joinedAfter: true });
    // A lesson that has not happened yet is different: the student is there from the start.
    const future = (await create(t, course.id, { date: FUTURE })).json.lessons[0] as Lesson;
    expect((await sheet(t, future.id)).json.students[0]).toMatchObject({
      status: "attended",
      joinedAfter: false,
    });
  });

  it("leaves out archived students, students who left before the lesson, and pending ones", async () => {
    const t = await createTeacher();
    const { course, lessons } = await lessonsOf(t);
    const [keep, archived, left, leftLater] = await Promise.all(
      ["Keep", "Archived", "Left", "LeftLater"].map((name) => addStudent(t, { name })),
    );
    await enroll(t, course.id, [keep!.id, archived!.id, left!.id, leftLater!.id]);
    await call(`/api/students/${archived!.id}/archive`, { method: "POST", cookie: t.cookie, body: {} });
    // "Left" stopped in 2019 (before the lesson). "LeftLater" stopped in 2021 (after it).
    await env.DB.prepare("UPDATE enrollments SET status = 'dropped', ended_at = ? WHERE student_id = ?")
      .bind("2019-06-01T00:00:00.000Z", left!.id)
      .run();
    await env.DB.prepare("UPDATE enrollments SET status = 'dropped', ended_at = ? WHERE student_id = ?")
      .bind("2021-06-01T00:00:00.000Z", leftLater!.id)
      .run();
    const names = (await sheet(t, lessons[0]!.id)).json.students.map((s: { name: string }) => s.name);
    expect(names).toEqual(["Keep", "LeftLater"]);
  });

  it("leaves out students whose place in the course is only pending", async () => {
    const t = await createTeacher();
    const { course, lessons } = await lessonsOf(t);
    const [waiting, joined] = [
      await addStudent(t, { name: "Waiting" }),
      await addStudent(t, { name: "Joined" }),
    ];
    await enroll(t, course.id, [waiting.id, joined.id]);
    await env.DB.prepare("UPDATE enrollments SET status = 'pending' WHERE student_id = ?")
      .bind(waiting.id)
      .run();
    const names = (await sheet(t, lessons[0]!.id)).json.students.map((s: { name: string }) => s.name);
    expect(names).toEqual(["Joined"]);
    // and cannot be marked either
    const res = await mark(t, lessons[0]!.id, [{ studentId: waiting.id, status: "attended" }]);
    expect(res.status).toBe(400);
  });

  it("never shows students of another teacher", async () => {
    const a = await createTeacher();
    const b = await createTeacher();
    const { lessons } = await lessonsOf(a);
    await addStudent(b, { name: "Somebody else's" });
    expect((await sheet(a, lessons[0]!.id)).json.students).toEqual([]);
    expect((await sheet(b, lessons[0]!.id)).status).toBe(404);
  });
});

describe("take attendance", () => {
  async function ready(names = ["Anh", "Bao", "Chi"]) {
    const t = await createTeacher();
    const { course, lessons } = await lessonsOf(t);
    const students = [];
    for (const name of names) students.push(await addStudent(t, { name }));
    await enroll(
      t,
      course.id,
      students.map((s) => s.id),
    );
    // Everyone joined before this old lesson took place, so they start as "attended".
    await env.DB.prepare(
      "UPDATE enrollments SET enrolled_at = '2019-01-01T00:00:00.000Z' WHERE tenant_id = ?",
    )
      .bind(t.tenantId)
      .run();
    return { t, course, lesson: lessons[0]!, students };
  }

  it("saves the marks, and the lesson becomes 'held'", async () => {
    const { t, lesson, students } = await ready();
    const res = await mark(t, lesson.id, [
      { studentId: students[0]!.id, status: "attended" },
      { studentId: students[1]!.id, status: "absent" },
      { studentId: students[2]!.id, status: "attended" },
    ]);
    expect(res.status).toBe(200);
    expect(res.json.lesson.status).toBe("held");
    expect(res.json.students.map((s: { status: string; saved: boolean }) => [s.status, s.saved])).toEqual([
      ["attended", true],
      ["absent", true],
      ["attended", true],
    ]);
    // and a fresh read gives the same
    expect((await sheet(t, lesson.id)).json.students.map((s: { status: string }) => s.status)).toEqual([
      "attended",
      "absent",
      "attended",
    ]);
  });

  it("can be saved again to fix a mistake, also after the lesson is held", async () => {
    const { t, lesson, students } = await ready(["Anh"]);
    const id = students[0]!.id;
    await mark(t, lesson.id, [{ studentId: id, status: "absent" }]);
    const res = await mark(t, lesson.id, [{ studentId: id, status: "attended" }]);
    expect(res.status).toBe(200);
    expect(res.json.students[0]).toMatchObject({ status: "attended", saved: true });
    expect(await count("SELECT COUNT(*) AS n FROM attendance WHERE lesson_id = ?", lesson.id)).toBe(1);
  });

  it("can save only some students, and leaves the others as they were", async () => {
    const { t, lesson, students } = await ready();
    await mark(
      t,
      lesson.id,
      students.map((s) => ({ studentId: s.id, status: "absent" })),
    );
    await mark(t, lesson.id, [{ studentId: students[1]!.id, status: "attended" }]);
    expect((await sheet(t, lesson.id)).json.students.map((s: { status: string }) => s.status)).toEqual([
      "absent",
      "attended",
      "absent",
    ]);
  });

  it("counts absent and attended in the audit log, and how many marks changed", async () => {
    const { t, lesson, students } = await ready();
    await mark(t, lesson.id, [
      { studentId: students[0]!.id, status: "attended" },
      { studentId: students[1]!.id, status: "absent" },
      { studentId: students[2]!.id, status: "attended" },
    ]);
    await mark(t, lesson.id, [
      { studentId: students[0]!.id, status: "attended" }, // same as before
      { studentId: students[1]!.id, status: "attended" }, // changed
    ]);
    const rows = await env.DB.prepare(
      "SELECT meta FROM audit_log WHERE tenant_id = ? AND action = 'attendance.saved' ORDER BY at, id",
    )
      .bind(t.tenantId)
      .all<{ meta: string }>();
    expect(rows.results.map((r) => JSON.parse(r.meta))).toEqual([
      { absent: 1, attended: 2, changed: 3 },
      { absent: 0, attended: 2, changed: 1 },
    ]);
  });

  it("marks 60 students in one request", async () => {
    const t = await createTeacher();
    const course = await createCourse(t, { maxStudents: null });
    const lessons = (await create(t, course.id)).json.lessons as Lesson[];
    const ids: string[] = [];
    for (let i = 0; i < 60; i++)
      ids.push((await addStudent(t, { name: `Student ${String(i).padStart(2, "0")}` })).id);
    await enroll(t, course.id, ids);
    await backdate(t.tenantId);
    const res = await mark(
      t,
      lessons[0]!.id,
      ids.map((studentId) => ({ studentId, status: "attended" })),
    );
    expect(res.status).toBe(200);
    expect(await count("SELECT COUNT(*) AS n FROM attendance WHERE lesson_id = ?", lessons[0]!.id)).toBe(60);
  });

  it("refuses a student who is not on the sheet, and saves nothing", async () => {
    const { t, lesson, students } = await ready();
    const stranger = await addStudent(t, { name: "Not in this course" });
    const other = await createTeacher();
    const foreign = await addStudent(other, { name: "Of another teacher" });
    for (const bad of [stranger.id, foreign.id, "made-up-id"]) {
      const res = await mark(t, lesson.id, [
        { studentId: students[0]!.id, status: "absent" },
        { studentId: bad, status: "attended" },
      ]);
      expect(res.status, bad).toBe(400);
      expect(res.json.error.fields).toHaveProperty("records");
    }
    expect(await count("SELECT COUNT(*) AS n FROM attendance WHERE lesson_id = ?", lesson.id)).toBe(0);
    expect((await sheet(t, lesson.id)).json.lesson.status).toBe("scheduled");
  });

  it("refuses the same student twice, and saves nothing", async () => {
    const { t, lesson, students } = await ready();
    const id = students[0]!.id;
    const res = await mark(t, lesson.id, [
      { studentId: id, status: "absent" },
      { studentId: id, status: "attended" },
    ]);
    expect(res.status).toBe(400);
    expect(await count("SELECT COUNT(*) AS n FROM attendance WHERE lesson_id = ?", lesson.id)).toBe(0);
  });

  it("refuses an archived student, and a student who left before the lesson", async () => {
    const { t, lesson, students } = await ready();
    await call(`/api/students/${students[0]!.id}/archive`, { method: "POST", cookie: t.cookie, body: {} });
    await env.DB.prepare(
      "UPDATE enrollments SET status = 'dropped', ended_at = '2019-06-01T00:00:00.000Z' WHERE student_id = ?",
    )
      .bind(students[1]!.id)
      .run();
    for (const s of [students[0]!, students[1]!]) {
      expect((await mark(t, lesson.id, [{ studentId: s.id, status: "attended" }])).status).toBe(400);
    }
  });

  it("refuses a status other than attended or absent", async () => {
    const { t, lesson, students } = await ready();
    for (const status of ["late", "excused", "", "ATTENDED", 1]) {
      const res = await mark(t, lesson.id, [{ studentId: students[0]!.id, status: status as string }]);
      expect(res.status, String(status)).toBe(400);
    }
    for (const records of [[], undefined, "x"]) {
      const res = await call(`/api/lessons/${lesson.id}/attendance`, {
        method: "PUT",
        cookie: t.cookie,
        body: { records },
      });
      expect(res.status).toBe(400);
    }
  });

  it("refuses a cancelled lesson", async () => {
    const { t, lesson, students } = await ready();
    await cancel(t, lesson.id);
    const res = await mark(t, lesson.id, [{ studentId: students[0]!.id, status: "attended" }]);
    expect(res.status).toBe(409);
    expect(await count("SELECT COUNT(*) AS n FROM attendance WHERE lesson_id = ?", lesson.id)).toBe(0);
  });

  it("refuses a lesson that has not started yet", async () => {
    const t = await createTeacher();
    const { course, lessons } = await lessonsOf(t, { date: FUTURE });
    const s = await addStudent(t);
    await enroll(t, course.id, [s.id]);
    const res = await mark(t, lessons[0]!.id, [{ studentId: s.id, status: "attended" }]);
    expect(res.status).toBe(409);
    expect(res.json.error.message).toMatch(/not started/);
    expect(await count("SELECT COUNT(*) AS n FROM attendance WHERE lesson_id = ?", lessons[0]!.id)).toBe(0);
  });

  it("keeps a saved mark on the sheet even after the student leaves the course", async () => {
    const { t, course, lesson, students } = await ready(["Anh"]);
    await mark(t, lesson.id, [{ studentId: students[0]!.id, status: "attended" }]);
    await call(`/api/courses/${course.id}/students/${students[0]!.id}`, {
      method: "PUT",
      cookie: t.cookie,
      body: { status: "dropped", customPrice: null },
    });
    await env.DB.prepare("UPDATE enrollments SET ended_at = '2019-06-01T00:00:00.000Z' WHERE student_id = ?")
      .bind(students[0]!.id)
      .run();
    const s = (await sheet(t, lesson.id)).json.students[0];
    expect(s).toMatchObject({ name: "Anh", status: "attended", saved: true, inCourse: false });
    // and the mark can still be corrected
    expect((await mark(t, lesson.id, [{ studentId: students[0]!.id, status: "absent" }])).status).toBe(200);
  });

  it("does not let another teacher read or save attendance", async () => {
    const { t, lesson, students } = await ready();
    const other = await createTeacher();
    expect((await sheet(other, lesson.id)).status).toBe(404);
    const res = await mark(other, lesson.id, [{ studentId: students[0]!.id, status: "absent" }]);
    expect(res.status).toBe(404);
    expect(await count("SELECT COUNT(*) AS n FROM attendance WHERE lesson_id = ?", lesson.id)).toBe(0);
    void t;
  });
});

describe("attendance of one student", () => {
  it("counts attended and absent lessons and lists the newest first", async () => {
    const t = await createTeacher();
    const course = await createCourse(t, { name: "English A1" });
    const s = await addStudent(t, { name: "Anh" });
    await enroll(t, course.id, [s.id]);
    const ids: string[] = [];
    for (const date of ["2020-01-06", "2020-01-13", "2020-01-20"]) {
      ids.push((await create(t, course.id, { date })).json.lessons[0].id);
    }
    await mark(t, ids[0]!, [{ studentId: s.id, status: "attended" }]);
    await mark(t, ids[1]!, [{ studentId: s.id, status: "absent" }]);
    await mark(t, ids[2]!, [{ studentId: s.id, status: "attended" }]);
    const res = await call(`/api/students/${s.id}/attendance`, { cookie: t.cookie });
    expect(res.status).toBe(200);
    expect(res.json.attendance).toMatchObject({ attended: 2, absent: 1 });
    expect(
      res.json.attendance.recent.map((r: { date: string; status: string }) => [r.date, r.status]),
    ).toEqual([
      ["2020-01-20", "attended"],
      ["2020-01-13", "absent"],
      ["2020-01-06", "attended"],
    ]);
    expect(res.json.attendance.recent[0]).toMatchObject({ courseName: "English A1", startTime: "18:30" });
  });

  it("is zero for a student with no lessons, and 'not found' for another teacher's student", async () => {
    const a = await createTeacher();
    const b = await createTeacher();
    const s = await addStudent(a);
    const own = await call(`/api/students/${s.id}/attendance`, { cookie: a.cookie });
    expect(own.json.attendance).toEqual({ attended: 0, absent: 0, recent: [] });
    expect((await call(`/api/students/${s.id}/attendance`, { cookie: b.cookie })).status).toBe(404);
  });
});

describe("the database refuses rows that mix tenants", () => {
  it("a lesson cannot point at another tenant's course", async () => {
    const a = await createTeacher();
    const b = await createTeacher();
    const course = await createCourse(a);
    await expect(
      env.DB.prepare(
        `INSERT INTO lessons (id, tenant_id, course_id, starts_at, ends_at, created_at, updated_at)
         VALUES ('x1', ?, ?, '2030-01-01T10:00:00.000Z', '2030-01-01T11:00:00.000Z', 'x', 'x')`,
      )
        .bind(b.tenantId, course.id)
        .run(),
    ).rejects.toThrow(/one tenant/);
  });

  it("attendance cannot join a lesson and a student of different tenants", async () => {
    const a = await createTeacher();
    const b = await createTeacher();
    const { lessons } = await lessonsOf(a);
    const foreign = await addStudent(b);
    await expect(
      env.DB.prepare(
        `INSERT INTO attendance (id, tenant_id, lesson_id, student_id, status, marked_at)
         VALUES ('x1', ?, ?, ?, 'attended', 'x')`,
      )
        .bind(a.tenantId, lessons[0]!.id, foreign.id)
        .run(),
    ).rejects.toThrow(/one tenant/);
    await expect(
      env.DB.prepare(
        `INSERT INTO attendance (id, tenant_id, lesson_id, student_id, status, marked_at)
         VALUES ('x2', ?, ?, ?, 'attended', 'x')`,
      )
        .bind(b.tenantId, lessons[0]!.id, foreign.id)
        .run(),
    ).rejects.toThrow(/one tenant/);
  });

  it("only allows attended and absent", async () => {
    const t = await createTeacher();
    const { lessons } = await lessonsOf(t);
    const s = await addStudent(t);
    await expect(
      env.DB.prepare(
        `INSERT INTO attendance (id, tenant_id, lesson_id, student_id, status, marked_at)
         VALUES ('x3', ?, ?, ?, 'late', 'x')`,
      )
        .bind(t.tenantId, lessons[0]!.id, s.id)
        .run(),
    ).rejects.toThrow();
  });
});

describe("who may use lessons", () => {
  it("a student gets 403 on every lesson route, and nobody signed out gets in", async () => {
    const t = await createTeacher();
    const { lessons } = await lessonsOf(t);
    const { createStudent } = await import("./helpers");
    const kid = await createStudent(t);
    const id = lessons[0]!.id;
    const calls: [string, string, unknown?][] = [
      ["GET", "/api/lessons?from=2020-01-01&to=2020-01-31"],
      ["GET", `/api/lessons/${id}`],
      ["PUT", `/api/lessons/${id}`, body({ version: 1 })],
      ["POST", `/api/lessons/${id}/cancel`, { scope: "this" }],
      ["POST", `/api/lessons/${id}/restore`, {}],
      ["GET", `/api/lessons/${id}/attendance`],
      ["PUT", `/api/lessons/${id}/attendance`, { records: [{ studentId: "x", status: "absent" }] }],
      ["GET", `/api/courses/${lessons[0]!.courseId}/lessons`],
    ];
    for (const [method, path, payload] of calls) {
      const asStudent = await call(path, { method, cookie: kid.cookie, body: payload });
      expect(asStudent.status, `${method} ${path}`).toBe(403);
      const anon = await call(path, { method, body: payload });
      expect(anon.status, `${method} ${path}`).toBe(401);
    }
  });
});

describe("lessons that repeat", () => {
  // The job looks at every repeat in the database, so each test starts with none from the other tests.
  beforeEach(async () => {
    await env.DB.prepare("DELETE FROM lesson_series").run();
  });

  const weekday = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay();
  const seriesRows = (courseId: string) =>
    count("SELECT COUNT(*) AS n FROM lesson_series WHERE course_id = ?", courseId);

  it("repeats every two weeks, on the weekday of the first lesson, up to the end date", async () => {
    const t = await createTeacher();
    const course = await createCourse(t);
    const res = await create(t, course.id, {
      date: FUTURE,
      repeat: "every_2_weeks",
      repeatUntil: plusDays(FUTURE, 28),
    });
    expect(res.status, JSON.stringify(res.json)).toBe(201);
    const lessons = res.json.lessons as Lesson[];
    expect(lessons.map((l) => l.date)).toEqual([FUTURE, plusDays(FUTURE, 14), plusDays(FUTURE, 28)]);
    expect(new Set(lessons.map((l) => weekday(l.date)))).toEqual(new Set([weekday(FUTURE)]));
    expect(new Set(lessons.map((l) => l.seriesId)).size).toBe(1);
    expect(await seriesRows(course.id)).toBe(0); // an end date: nothing more to make later
  });

  it("stops at the last day that fits: an end date between two lessons makes no extra lesson", async () => {
    const t = await createTeacher();
    const course = await createCourse(t);
    const res = await create(t, course.id, {
      date: FUTURE,
      repeat: "weekly",
      repeatUntil: plusDays(FUTURE, 20),
    });
    expect((res.json.lessons as Lesson[]).map((l) => l.date)).toEqual([
      FUTURE,
      plusDays(FUTURE, 7),
      plusDays(FUTURE, 14),
    ]);
    // The end date itself counts.
    const same = await create(t, course.id, { date: FUTURE, repeat: "weekly", repeatUntil: FUTURE });
    expect((same.json.lessons as Lesson[]).map((l) => l.date)).toEqual([FUTURE]);
  });

  it("a lesson that does not repeat has no series, and an end date is not used", async () => {
    const t = await createTeacher();
    const course = await createCourse(t);
    const res = await create(t, course.id, {
      date: FUTURE,
      repeat: "none",
      repeatUntil: plusDays(FUTURE, 70),
    });
    expect(res.json.lessons).toHaveLength(1);
    expect(res.json.lessons[0].seriesId).toBeNull();
    expect(await seriesRows(course.id)).toBe(0);
  });

  it("with no end date, makes the lessons of the next 26 weeks, and keeps a record of the repeat", async () => {
    const t = await createTeacher();
    const course = await createCourse(t);
    const weekly = await create(t, course.id, { date: FUTURE, repeat: "weekly" });
    expect(weekly.status, JSON.stringify(weekly.json)).toBe(201);
    expect(weekly.json.lessons).toHaveLength(27); // week 0 to week 26
    const every2 = await create(t, course.id, { date: FUTURE, repeat: "every_2_weeks" });
    expect(every2.json.lessons).toHaveLength(14); // week 0, 2, ... 26
    expect(await seriesRows(course.id)).toBe(2);
    const row = await env.DB.prepare("SELECT every_weeks, ended FROM lesson_series WHERE id = ?")
      .bind(weekly.json.lessons[0].seriesId)
      .first();
    expect(row).toEqual({ every_weeks: 1, ended: 0 });
  });

  it("keeps making lessons ahead while time passes, once, and in the same way as the last lesson", async () => {
    const t = await createTeacher();
    const course = await createCourse(t);
    const first = (
      await create(t, course.id, {
        date: FUTURE,
        startTime: "07:15",
        durationMinutes: 45,
        title: "Speaking club",
        place: "Room 5",
        onlineUrl: "https://meet.example.com/x",
        repeat: "weekly",
      })
    ).json.lessons as Lesson[];
    expect(first).toHaveLength(27);
    const now = new Date(`${plusDays(FUTURE, 70)}T05:00:00Z`); // ten weeks later
    expect(await extendOpenSeries(env, now)).toBe(10);
    const all = await list(t, course.id);
    expect(all).toHaveLength(37);
    const added = all.slice(27);
    expect(added.map((l) => l.date)).toEqual(
      Array.from({ length: 10 }, (_, i) => plusDays(FUTURE, 7 * (27 + i))),
    );
    for (const l of added) {
      expect(l).toMatchObject({
        startTime: "07:15",
        endTime: "08:00",
        title: "Speaking club",
        place: "Room 5",
        onlineUrl: "https://meet.example.com/x",
        status: "scheduled",
        seriesId: first[0]!.seriesId,
      });
    }
    // Running it again (the job runs every hour) makes nothing new.
    expect(await extendOpenSeries(env, now)).toBe(0);
    expect(await list(t, course.id)).toHaveLength(37);
  });

  it("does not make lessons for the days that are already past when the job was late", async () => {
    const t = await createTeacher();
    const course = await createCourse(t);
    await create(t, course.id, { date: FUTURE, repeat: "every_2_weeks" }); // last lesson: week 26
    const now = new Date(`${plusDays(FUTURE, 7 * 60)}T05:00:00Z`); // 60 weeks later
    await extendOpenSeries(env, now);
    const all = await list(t, course.id);
    const later = all.filter((l) => l.date > plusDays(FUTURE, 7 * 26));
    expect(later.length).toBeGreaterThan(0);
    expect(later.every((l) => l.date >= plusDays(FUTURE, 7 * 60))).toBe(true);
    expect(new Set(later.map((l) => weekday(l.date)))).toEqual(new Set([weekday(FUTURE)]));
  });

  it("stops making lessons when the teacher cancels this and the next lessons, or the course is archived", async () => {
    const t = await createTeacher();
    const a = await createCourse(t);
    const b = await createCourse(t);
    const la = (await create(t, a.id, { date: FUTURE, repeat: "weekly" })).json.lessons as Lesson[];
    await create(t, b.id, { date: FUTURE, repeat: "weekly" });
    expect((await cancel(t, la[5]!.id, "following")).status).toBe(200);
    expect(await count("SELECT ended AS n FROM lesson_series WHERE id = ?", la[0]!.seriesId)).toBe(1);
    await call(`/api/courses/${b.id}/archive`, { method: "POST", cookie: t.cookie, body: {} });
    const now = new Date(`${plusDays(FUTURE, 70)}T05:00:00Z`);
    expect(await extendOpenSeries(env, now)).toBe(0);
    expect(await list(t, a.id)).toHaveLength(27);
    // Cancelling only one lesson does not stop the repeat.
    const c = await createCourse(t);
    const lc = (await create(t, c.id, { date: FUTURE, repeat: "weekly" })).json.lessons as Lesson[];
    await cancel(t, lc[3]!.id, "this");
    expect(await extendOpenSeries(env, now)).toBe(10);
  });

  it("makes no series when the lessons are refused", async () => {
    const t = await createTeacher();
    const course = await createCourse(t);
    await env.DB.prepare(
      `WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 480)
       INSERT INTO lessons (id, tenant_id, course_id, starts_at, ends_at, created_at, updated_at)
       SELECT 'repeatbulk-' || i, ?1, ?2, '2030-01-01T10:00:00.000Z', '2030-01-01T11:00:00.000Z', 'x', 'x' FROM n`,
    )
      .bind(t.tenantId, course.id)
      .run();
    expect((await create(t, course.id, { date: FUTURE, repeat: "weekly" })).status).toBe(409); // 27 more do not fit
    expect(await seriesRows(course.id)).toBe(0);
  });

  it("one teacher's repeats are not touched by another teacher", async () => {
    const a = await createTeacher();
    const b = await createTeacher();
    const course = await createCourse(a);
    const lessons = (await create(a, course.id, { date: FUTURE, repeat: "weekly" })).json.lessons as Lesson[];
    expect((await cancel(b, lessons[2]!.id, "following")).status).toBe(404);
    expect(await count("SELECT ended AS n FROM lesson_series WHERE id = ?", lessons[0]!.seriesId)).toBe(0);
  });
});
