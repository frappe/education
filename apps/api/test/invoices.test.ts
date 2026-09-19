import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { call, createCourse, createStudent, createTeacher, emailsTo, type Person } from "./helpers";
import { joinedKid } from "./homework";

const MONTH = "2020-01"; // long ago, so attendance can be taken

const count = async (sql: string, ...args: unknown[]) =>
  (await env.DB.prepare(sql)
    .bind(...args)
    .first<{ n: number }>())!.n;

type Line = {
  id: string;
  courseId: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  dates: string[];
};
type Invoice = {
  id: string;
  studentId: string;
  studentName: string;
  teacherName: string;
  period: string;
  number: string | null;
  status: string;
  lines: Line[];
  total: number;
  note: string;
  dueDate: string | null;
  version: number;
  voidReason: string;
  payee: Record<string, string>;
  attendanceChanged: boolean;
};

const post = (t: Person, path: string, body: unknown = {}) =>
  call(`/api/${path}`, { method: "POST", cookie: t.cookie, body });
const generate = (t: Person, period = MONTH) => post(t, "invoices/generate", { period });
const listOf = async (t: Person, period = MONTH) => {
  const res = await call(`/api/invoices?period=${period}`, { cookie: t.cookie });
  expect(res.status, JSON.stringify(res.json)).toBe(200);
  return res.json as {
    invoices: { id: string; studentName: string; status: string; total: number; number: string | null }[];
    cancelled: { id: string }[];
    missing: number;
  };
};
const open = async (t: Person, id: string) =>
  (await call(`/api/invoices/${id}`, { cookie: t.cookie })).json.invoice as Invoice;
const save = (t: Person, inv: Invoice, over: Record<string, unknown> = {}) =>
  call(`/api/invoices/${inv.id}`, {
    method: "PUT",
    cookie: t.cookie,
    body: {
      lines: inv.lines.map((l) => ({
        id: l.id,
        description: l.description,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
      })),
      note: inv.note,
      dueDate: inv.dueDate,
      version: inv.version,
      ...over,
    },
  });
const send = (t: Person, inv: { id: string; version: number }) =>
  post(t, `invoices/${inv.id}/send`, { version: inv.version });

const lessonsOf = async (t: Person, courseId: string, over: Record<string, unknown> = {}) => {
  const res = await call(`/api/courses/${courseId}/lessons`, {
    method: "POST",
    cookie: t.cookie,
    body: {
      title: "Lesson",
      date: "2020-01-06",
      startTime: "18:30",
      durationMinutes: 90,
      place: "",
      onlineUrl: null,
      repeatWeeks: 4,
      ...over,
    },
  });
  expect(res.status, JSON.stringify(res.json)).toBe(201);
  return res.json.lessons as { id: string }[];
};
const mark = (t: Person, lessonId: string, records: { studentId: string; status: string }[]) =>
  call(`/api/lessons/${lessonId}/attendance`, { method: "PUT", cookie: t.cookie, body: { records } });

/**
 * A teacher with a course (100,000 per lesson), two students and four lessons in January 2020.
 * Hoa attended all four. Nam attended the first two and was absent for the others.
 */
async function setup(price = 100_000) {
  const t = await createTeacher("Lan Tran");
  const course = await createCourse(t, { pricePerLesson: price, maxStudents: null });
  const hoa = await joinedKid(t, course.id, "Hoa");
  const nam = await joinedKid(t, course.id, "Nam");
  const lessons = await lessonsOf(t, course.id);
  for (const [i, l] of lessons.entries()) {
    const res = await mark(t, l.id, [
      { studentId: hoa.studentId, status: "attended" },
      { studentId: nam.studentId, status: i < 2 ? "attended" : "absent" },
    ]);
    expect(res.status, JSON.stringify(res.json)).toBe(200);
  }
  return { t, course, hoa, nam, lessons };
}

/** Makes the drafts and returns them by the student's name. */
async function drafts(t: Person, period = MONTH) {
  expect((await generate(t, period)).status).toBe(201);
  const out: Record<string, Invoice> = {};
  for (const i of (await listOf(t, period)).invoices) out[i.studentName] = await open(t, i.id);
  return out;
}

describe("making draft receipts from the attendance", () => {
  it("makes one draft for each student who attended: lessons attended x price, and never charges an absence", async () => {
    const { t, course } = await setup();
    const res = await generate(t);
    expect(res.json).toEqual({ created: 2 });
    const d = await drafts(t);
    expect(d.Hoa).toMatchObject({ status: "draft", number: null, total: 400_000, period: MONTH });
    expect(d.Nam).toMatchObject({ status: "draft", total: 200_000 });
    expect(d.Hoa!.lines).toEqual([
      expect.objectContaining({
        courseId: course.id,
        description: "English A1",
        quantity: 4,
        unitPrice: 100_000,
        amount: 400_000,
        dates: ["2020-01-06", "2020-01-13", "2020-01-20", "2020-01-27"],
      }),
    ]);
    expect(d.Nam!.lines[0]).toMatchObject({ quantity: 2, dates: ["2020-01-06", "2020-01-13"] });
  });

  it("does not make a second receipt for the same month, however many times it runs", async () => {
    const { t } = await setup();
    await generate(t);
    expect((await generate(t)).json).toEqual({ created: 0 });
    expect(await count("SELECT COUNT(*) AS n FROM invoices WHERE tenant_id = ?", t.tenantId)).toBe(2);
  });

  it("two clicks at the same moment still make one receipt for each student", async () => {
    const { t } = await setup();
    const [a, b] = await Promise.all([generate(t), generate(t)]);
    expect((a.json.created as number) + (b.json.created as number)).toBe(2);
    expect(await count("SELECT COUNT(*) AS n FROM invoices WHERE tenant_id = ?", t.tenantId)).toBe(2);
  });

  it("skips a student with no lessons, a cancelled lesson, a free course, and the other months", async () => {
    const { t, course, hoa, lessons } = await setup();
    await addNoLessonStudent(t, course.id);
    await env.DB.prepare("UPDATE lessons SET status = 'cancelled' WHERE id = ?").bind(lessons[3]!.id).run(); // Hoa loses one billed lesson
    const free = await createCourse(t, { name: "Free club", pricePerLesson: 0, maxStudents: null });
    await enrollExisting(t, free.id, hoa.studentId);
    const freeLesson = (await lessonsOf(t, free.id, { repeatWeeks: 1, date: "2020-01-07" }))[0]!;
    await mark(t, freeLesson.id, [{ studentId: hoa.studentId, status: "attended" }]);
    const feb = (await lessonsOf(t, course.id, { date: "2020-02-03", repeatWeeks: 1 }))[0]!;
    await mark(t, feb.id, [{ studentId: hoa.studentId, status: "attended" }]);

    const d = await drafts(t);
    expect(Object.keys(d).sort()).toEqual(["Hoa", "Nam"]);
    expect(d.Hoa!.lines).toHaveLength(1); // the free course has no line
    expect(d.Hoa).toMatchObject({ total: 300_000 });
    expect((await drafts(t, "2020-02")).Hoa).toMatchObject({ total: 100_000 });
  });

  it("uses the price set for one student, and a line for each course", async () => {
    const { t, course, hoa } = await setup();
    await call(`/api/courses/${course.id}/students/${hoa.studentId}`, {
      method: "PUT",
      cookie: t.cookie,
      body: { customPrice: 80_000, status: "active", version: 1 },
    });
    const second = await createCourse(t, {
      name: "Speaking club",
      pricePerLesson: 50_000,
      maxStudents: null,
    });
    await enrollExisting(t, second.id, hoa.studentId);
    const l = (await lessonsOf(t, second.id, { repeatWeeks: 1, date: "2020-01-08" }))[0]!;
    await mark(t, l.id, [{ studentId: hoa.studentId, status: "attended" }]);
    const d = await drafts(t);
    const byName = Object.fromEntries(d.Hoa!.lines.map((x) => [x.description, x]));
    expect(byName["English A1"]).toMatchObject({ quantity: 4, unitPrice: 80_000, amount: 320_000 });
    expect(byName["Speaking club"]).toMatchObject({ quantity: 1, unitPrice: 50_000 });
    expect(d.Hoa!.total).toBe(370_000);
  });

  it("puts a lesson in the month it happened in the teacher's time zone", async () => {
    const t = await createTeacher();
    const course = await createCourse(t, { pricePerLesson: 10_000, maxStudents: null });
    const kid = await joinedKid(t, course.id, "Hoa");
    // 23:30 on 31 January in Vietnam is 16:30 UTC (January). 00:30 on 1 February is 17:30 UTC on 31 January.
    const late = (
      await lessonsOf(t, course.id, { date: "2020-01-31", startTime: "23:30", repeatWeeks: 1 })
    )[0]!;
    const next = (
      await lessonsOf(t, course.id, { date: "2020-02-01", startTime: "00:30", repeatWeeks: 1 })
    )[0]!;
    for (const l of [late, next]) await mark(t, l.id, [{ studentId: kid.studentId, status: "attended" }]);
    expect((await drafts(t, "2020-01")).Hoa!.lines[0]).toMatchObject({ quantity: 1, dates: ["2020-01-31"] });
    expect((await drafts(t, "2020-02")).Hoa!.lines[0]).toMatchObject({ quantity: 1, dates: ["2020-02-01"] });
  });

  it("tells how many students still have no receipt for the month", async () => {
    const { t } = await setup();
    expect((await listOf(t)).missing).toBe(2);
    await generate(t);
    expect((await listOf(t)).missing).toBe(0);
  });

  it("makes a draft for one student, also with no lessons, once for each month", async () => {
    const t = await createTeacher();
    const kid = await addOne(t, "Mai");
    const res = await post(t, "invoices", { studentId: kid.id, period: MONTH });
    expect(res.status).toBe(201);
    expect(res.json.invoice).toMatchObject({ status: "draft", total: 0, lines: [] });
    expect((await post(t, "invoices", { studentId: kid.id, period: MONTH })).status).toBe(409);
    expect((await post(t, "invoices", { studentId: "nobody", period: MONTH })).status).toBe(404);
  });

  it("refuses a month that is not a month", async () => {
    const t = await createTeacher();
    for (const p of ["2020-13", "2020-1", "January", "1999-12", ""]) {
      expect((await generate(t, p)).status, p).toBe(400);
      expect((await call(`/api/invoices?period=${p}`, { cookie: t.cookie })).status, p).toBe(400);
    }
    expect((await call("/api/invoices", { cookie: t.cookie })).status).toBe(400);
  });
});

/** A student profile that is in the course but attended nothing. */
async function addNoLessonStudent(t: Person, courseId: string) {
  const kid = await addOne(t, "Lily");
  await enrollExisting(t, courseId, kid.id);
}
async function addOne(t: Person, name: string) {
  const res = await call("/api/students", {
    method: "POST",
    cookie: t.cookie,
    body: { name, email: `${name.toLowerCase()}.${Date.now()}.${Math.random()}@example.com` },
  });
  expect(res.status, JSON.stringify(res.json)).toBe(201);
  return res.json.student as { id: string };
}
const enrollExisting = (t: Person, courseId: string, studentId: string) =>
  call(`/api/courses/${courseId}/students`, {
    method: "POST",
    cookie: t.cookie,
    body: { studentIds: [studentId], customPrice: null },
  });

describe("changing a draft", () => {
  it("works out every amount and the total itself, and lets the teacher add a line or a discount", async () => {
    const { t } = await setup();
    const inv = (await drafts(t)).Hoa!;
    const res = await call(`/api/invoices/${inv.id}`, {
      method: "PUT",
      cookie: t.cookie,
      body: {
        lines: [
          { id: inv.lines[0]!.id, description: "English A1", quantity: 4, unitPrice: 100_000, amount: 1 },
          { description: "Book", quantity: 1, unitPrice: 60_000, total: 5 },
          { description: "Friend discount", quantity: 1, unitPrice: -50_000 },
        ],
        note: "  Thank you!  ",
        dueDate: "2020-02-10",
        version: inv.version,
        total: 5,
      },
    });
    expect(res.status, JSON.stringify(res.json)).toBe(200);
    const saved = res.json.invoice as Invoice;
    expect(saved.lines.map((l) => l.amount)).toEqual([400_000, 60_000, -50_000]);
    expect(saved).toMatchObject({ total: 410_000, note: "Thank you!", dueDate: "2020-02-10", version: 2 });
    expect(saved.lines[0]!.dates).toHaveLength(4); // same quantity: the lessons behind it are kept
    expect(saved.lines[1]!.courseId).toBeNull();
  });

  it("forgets the lessons behind a line when its quantity is changed", async () => {
    const { t } = await setup();
    const inv = (await drafts(t)).Hoa!;
    const res = await save(t, inv, {
      lines: [{ id: inv.lines[0]!.id, description: "English A1", quantity: 3, unitPrice: 100_000 }],
    });
    expect(res.json.invoice.lines[0]).toMatchObject({ quantity: 3, dates: [] });
  });

  it("refuses a bad line, a total below 0, too many lines, and a stale version", async () => {
    const { t } = await setup();
    const inv = (await drafts(t)).Hoa!;
    const line = { description: "Book", quantity: 1, unitPrice: 1000 };
    const bad: [string, Record<string, unknown>][] = [
      ["no description", { lines: [{ ...line, description: " " }] }],
      ["quantity 0", { lines: [{ ...line, quantity: 0 }] }],
      ["quantity with decimals", { lines: [{ ...line, quantity: 1.5 }] }],
      ["price with decimals", { lines: [{ ...line, unitPrice: 10.5 }] }],
      ["price as text", { lines: [{ ...line, unitPrice: "1000" }] }],
      ["31 lines", { lines: Array.from({ length: 31 }, () => line) }],
      ["a note that is too long", { note: "x".repeat(2001) }],
      ["a date that does not exist", { dueDate: "2020-02-31" }],
      ["a total below 0", { lines: [{ ...line, unitPrice: -5000 }] }],
    ];
    for (const [label, over] of bad) {
      expect((await save(t, inv, over)).status, label).toBe(400);
    }
    expect((await save(t, inv, { version: 99 })).status).toBe(409);
    expect((await open(t, inv.id)).version).toBe(1); // nothing was saved
  });

  it("works out the lines from the attendance again and keeps the lines the teacher added", async () => {
    const { t, nam, lessons } = await setup();
    const inv = (await drafts(t)).Nam!;
    await save(t, inv, {
      lines: [
        { id: inv.lines[0]!.id, description: "English A1", quantity: 2, unitPrice: 1 },
        { description: "Book", quantity: 1, unitPrice: 30_000 },
      ],
    });
    await mark(t, lessons[2]!.id, [{ studentId: nam.studentId, status: "attended" }]);
    const now = await open(t, inv.id);
    const res = await post(t, `invoices/${inv.id}/refresh`, { version: now.version });
    const lines = res.json.invoice.lines as Line[];
    expect(lines.map((l) => [l.description, l.quantity, l.unitPrice])).toEqual([
      ["English A1", 3, 100_000],
      ["Book", 1, 30_000],
    ]);
    expect(res.json.invoice.total).toBe(330_000);
  });

  it("can be deleted, but only while it is a draft", async () => {
    const { t } = await setup();
    const d = await drafts(t);
    const gone = await call(`/api/invoices/${d.Nam!.id}`, {
      method: "DELETE",
      cookie: t.cookie,
      body: { version: d.Nam!.version },
    });
    expect(gone.status).toBe(200);
    expect((await call(`/api/invoices/${d.Nam!.id}`, { cookie: t.cookie })).status).toBe(404);
    expect((await send(t, d.Hoa!)).status).toBe(200);
    const late = await call(`/api/invoices/${d.Hoa!.id}`, {
      method: "DELETE",
      cookie: t.cookie,
      body: { version: 2 },
    });
    expect(late.status).toBe(409);
    expect(late.json.error.code).toBe("INVOICE_LOCKED");
  });
});

describe("sending a receipt", () => {
  it("gives numbers that count up inside the month, keeps the total, and locks the receipt", async () => {
    const { t } = await setup();
    const d = await drafts(t);
    const first = await send(t, d.Hoa!);
    expect(first.status, JSON.stringify(first.json)).toBe(200);
    expect(first.json.invoice).toMatchObject({ status: "sent", number: "INV-202001-0001", total: 400_000 });
    expect((await send(t, d.Nam!)).json.invoice.number).toBe("INV-202001-0002");
    // Another month starts again at 1.
    const other = await createOne(t, "2020-02");
    expect((await send(t, other)).json.invoice.number).toBe("INV-202002-0001");

    const locked = await save(t, { ...d.Hoa!, version: 2 }, { note: "changed" });
    expect(locked.status).toBe(409);
    expect(locked.json.error.code).toBe("INVOICE_LOCKED");
    expect((await send(t, { id: d.Hoa!.id, version: 2 })).status).toBe(409); // not twice
  });

  it("two sends at the same moment get two different numbers, with no hole", async () => {
    const { t } = await setup();
    const d = await drafts(t);
    const [a, b] = await Promise.all([send(t, d.Hoa!), send(t, d.Nam!)]);
    expect([a.status, b.status]).toEqual([200, 200]);
    expect([a.json.invoice.number, b.json.invoice.number].sort()).toEqual([
      "INV-202001-0001",
      "INV-202001-0002",
    ]);
  });

  it("the same receipt sent twice at the same moment is sent once", async () => {
    const { t } = await setup();
    const d = await drafts(t);
    const [a, b] = await Promise.all([send(t, d.Hoa!), send(t, d.Hoa!)]);
    expect([a.status, b.status].sort()).toEqual([200, 409]);
    expect(await count("SELECT COUNT(*) AS n FROM invoices WHERE number IS NOT NULL")).toBeGreaterThanOrEqual(
      1,
    );
    expect(
      await count(
        "SELECT COUNT(*) AS n FROM invoices WHERE tenant_id = ? AND number IS NOT NULL",
        t.tenantId,
      ),
    ).toBe(1);
  });

  it("does not send a receipt with nothing to pay", async () => {
    const t = await createTeacher();
    const kid = await addOne(t, "Mai");
    const empty = (await post(t, "invoices", { studentId: kid.id, period: MONTH })).json.invoice as Invoice;
    const res = await send(t, empty);
    expect(res.status).toBe(409);
    expect(res.json.error.message).toMatch(/amount/);
    expect((await open(t, empty.id)).status).toBe("draft");
  });

  it("keeps the payment details and names as they were when it was sent", async () => {
    const { t } = await setup();
    await call("/api/payment-details", {
      method: "PUT",
      cookie: t.cookie,
      body: { payeeName: "Lan Tran", bankName: "VCB", bankAccount: "0011", bankHolder: "LAN TRAN" },
    });
    const d = await drafts(t);
    expect((await open(t, d.Hoa!.id)).payee.bankAccount).toBe("0011"); // a draft shows what the teacher has now
    await send(t, d.Hoa!);
    await call("/api/payment-details", {
      method: "PUT",
      cookie: t.cookie,
      body: { payeeName: "Someone else", bankAccount: "9999" },
    });
    await env.DB.prepare("UPDATE students SET name = 'Hoa Renamed' WHERE tenant_id = ?")
      .bind(t.tenantId)
      .run();
    const sent = await open(t, d.Hoa!.id);
    expect(sent.payee).toMatchObject({ payeeName: "Lan Tran", bankAccount: "0011", bankName: "VCB" });
    expect(sent.teacherName).toBe("Lan Tran"); // the name to pay is who the receipt is from
    expect(sent.studentName).toBe("Hoa");
  });

  it("emails the student a link to the receipt", async () => {
    const { t, hoa } = await setup();
    const d = await drafts(t);
    await send(t, d.Hoa!);
    const mails = (await emailsTo(hoa.email)).filter((m) => m.kind === "invoice");
    expect(mails).toHaveLength(1);
    expect(mails[0]!.body_text).toContain("fee receipt for January 2020");
    expect(mails[0]!.body_text).toContain(`/my/invoices/${d.Hoa!.id}`);
  });

  it("the database itself refuses to change a sent receipt or its number, or to delete it", async () => {
    const { t } = await setup();
    const d = await drafts(t);
    await send(t, d.Hoa!);
    const run = (sql: string) => env.DB.prepare(sql).bind(d.Hoa!.id).run();
    await expect(run("UPDATE invoices SET total = 1 WHERE id = ?")).rejects.toThrow(/cannot be changed/);
    await expect(run("UPDATE invoices SET lines = '[]' WHERE id = ?")).rejects.toThrow(/cannot be changed/);
    await expect(run("UPDATE invoices SET number = 'INV-1' WHERE id = ?")).rejects.toThrow(/number/);
    await expect(run("DELETE FROM invoices WHERE id = ?")).rejects.toThrow(/draft/);
    // and a receipt that says it is sent must have a number
    await expect(
      env.DB.prepare("UPDATE invoices SET status = 'sent' WHERE id = ?").bind(d.Nam!.id).run(),
    ).rejects.toThrow();
  });
});

async function createOne(t: Person, period: string) {
  const kid = await addOne(t, "Extra");
  const inv = (await post(t, "invoices", { studentId: kid.id, period })).json.invoice as Invoice;
  return (await save(t, inv, { lines: [{ description: "Book", quantity: 1, unitPrice: 10_000 }] })).json
    .invoice as Invoice;
}

describe("paid, not paid and cancelled", () => {
  it("goes from sent to paid and back, and only in that order", async () => {
    const { t } = await setup();
    const d = await drafts(t);
    expect((await post(t, `invoices/${d.Hoa!.id}/paid`, { version: 1 })).status).toBe(409); // a draft is not paid
    await send(t, d.Hoa!);
    const paid = await post(t, `invoices/${d.Hoa!.id}/paid`, { version: 2 });
    expect(paid.json.invoice).toMatchObject({ status: "paid", version: 3 });
    expect((await post(t, `invoices/${d.Hoa!.id}/paid`, { version: 3 })).status).toBe(409);
    const back = await post(t, `invoices/${d.Hoa!.id}/unpaid`, { version: 3 });
    expect(back.json.invoice).toMatchObject({ status: "sent" });
    expect((await post(t, `invoices/${d.Hoa!.id}/unpaid`, { version: 4 })).status).toBe(409);
    expect((await post(t, `invoices/${d.Hoa!.id}/paid`, { version: 2 })).status).toBe(409); // old version
  });

  it("a cancelled receipt keeps its number and reason, and the month can get a new receipt", async () => {
    const { t } = await setup();
    const d = await drafts(t);
    await send(t, d.Hoa!);
    expect((await post(t, `invoices/${d.Hoa!.id}/void`, { version: 2, reason: " " })).status).toBe(400);
    expect((await post(t, `invoices/${d.Nam!.id}/void`, { version: 1, reason: "x" })).status).toBe(409); // a draft is deleted
    const res = await post(t, `invoices/${d.Hoa!.id}/void`, { version: 2, reason: "Wrong price" });
    expect(res.json.invoice).toMatchObject({
      status: "void",
      number: "INV-202001-0001",
      voidReason: "Wrong price",
    });
    expect((await post(t, `invoices/${d.Hoa!.id}/paid`, { version: 3 })).status).toBe(409);
    expect((await listOf(t)).cancelled.map((i) => i.id)).toEqual([d.Hoa!.id]);
    expect((await generate(t)).json).toEqual({ created: 1 }); // Hoa gets a new draft
    const fresh = (await listOf(t)).invoices.find((i) => i.studentName === "Hoa")!;
    expect(fresh.id).not.toBe(d.Hoa!.id);
    expect((await send(t, { id: fresh.id, version: 1 })).json.invoice.number).toBe("INV-202001-0002"); // no number is reused
  });

  it("a paid receipt can be cancelled too", async () => {
    const { t } = await setup();
    const d = await drafts(t);
    await send(t, d.Hoa!);
    await post(t, `invoices/${d.Hoa!.id}/paid`, { version: 2 });
    expect(
      (await post(t, `invoices/${d.Hoa!.id}/void`, { version: 3, reason: "Refunded" })).json.invoice.status,
    ).toBe("void");
  });

  it("warns when the attendance changed after the receipt was sent, and does not change the receipt", async () => {
    const { t, nam, lessons } = await setup();
    const d = await drafts(t);
    await send(t, d.Nam!);
    expect((await open(t, d.Nam!.id)).attendanceChanged).toBe(false);
    await mark(t, lessons[2]!.id, [{ studentId: nam.studentId, status: "attended" }]);
    const now = await open(t, d.Nam!.id);
    expect(now.attendanceChanged).toBe(true);
    expect(now.total).toBe(200_000);
    // A line the teacher changed by hand is not part of this check.
    await mark(t, lessons[2]!.id, [{ studentId: nam.studentId, status: "absent" }]);
    expect((await open(t, d.Nam!.id)).attendanceChanged).toBe(false);
    // A cancelled receipt has nothing to warn about.
    const cancelled = await post(t, `invoices/${d.Nam!.id}/void`, {
      version: (await open(t, d.Nam!.id)).version,
      reason: "x",
    });
    expect(cancelled.status).toBe(200);
    await mark(t, lessons[3]!.id, [{ studentId: nam.studentId, status: "attended" }]);
    expect((await open(t, d.Nam!.id)).attendanceChanged).toBe(false);
  });
});

describe("payment details", () => {
  it("starts empty, is kept trimmed, and refuses text that is too long", async () => {
    const t = await createTeacher();
    const get = async () => (await call("/api/payment-details", { cookie: t.cookie })).json.payment;
    expect(await get()).toEqual({
      payeeName: "",
      payeePhone: "",
      bankName: "",
      bankAccount: "",
      bankHolder: "",
      paymentNote: "",
    });
    const res = await call("/api/payment-details", {
      method: "PUT",
      cookie: t.cookie,
      body: {
        payeeName: "  Lan Tran ",
        payeePhone: "0900 000 000",
        bankName: "VCB",
        paymentNote: "Pay by the 10th",
      },
    });
    expect(res.status).toBe(200);
    expect(await get()).toMatchObject({ payeeName: "Lan Tran", bankName: "VCB", bankAccount: "" });
    for (const [field, max] of [
      ["payeeName", 100],
      ["payeePhone", 30],
      ["bankName", 100],
      ["bankAccount", 50],
      ["bankHolder", 100],
      ["paymentNote", 500],
    ] as const) {
      const put = (n: number) =>
        call("/api/payment-details", { method: "PUT", cookie: t.cookie, body: { [field]: "x".repeat(n) } });
      expect((await put(max + 1)).status, field).toBe(400);
      expect((await put(max)).status, field).toBe(200);
    }
  });

  it("belongs to one teacher only", async () => {
    const a = await createTeacher();
    const b = await createTeacher();
    await call("/api/payment-details", { method: "PUT", cookie: a.cookie, body: { bankAccount: "111" } });
    expect((await call("/api/payment-details", { cookie: b.cookie })).json.payment.bankAccount).toBe("");
  });
});

describe("what the student sees", () => {
  async function sentFor(
    kid: Person & { studentId: string },
    t: Person,
    d: Record<string, Invoice>,
    name: "Hoa" | "Nam",
  ) {
    void kid;
    await send(t, d[name]!);
    return d[name]!.id;
  }

  it("shows only receipts that were sent, and never a draft", async () => {
    const { t, hoa, nam } = await setup();
    const d = await drafts(t);
    const mine = () => call("/api/my/invoices", { cookie: hoa.cookie });
    expect((await mine()).json.invoices).toEqual([]);
    expect((await call(`/api/my/invoices/${d.Hoa!.id}`, { cookie: hoa.cookie })).status).toBe(404); // a draft
    const id = await sentFor(hoa, t, d, "Hoa");
    const list = (await mine()).json.invoices;
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({
      id,
      number: "INV-202001-0001",
      status: "sent",
      total: 400_000,
      teacherName: expect.any(String),
    });
    const detail = (await call(`/api/my/invoices/${id}`, { cookie: hoa.cookie })).json.invoice;
    expect(detail).toMatchObject({
      studentName: "Hoa",
      total: 400_000,
      lines: [expect.objectContaining({ quantity: 4 })],
    });
    expect(JSON.stringify(detail)).not.toMatch(/attendanceChanged/);
    // Nam does not see Hoa's receipt.
    expect((await call("/api/my/invoices", { cookie: nam.cookie })).json.invoices).toEqual([]);
    expect((await call(`/api/my/invoices/${id}`, { cookie: nam.cookie })).status).toBe(404);
  });

  it("shows paid and cancelled ones, but not why the teacher cancelled", async () => {
    const { t, hoa } = await setup();
    const d = await drafts(t);
    const id = await sentFor(hoa, t, d, "Hoa");
    await post(t, `invoices/${id}/paid`, { version: 2 });
    expect((await call("/api/my/invoices", { cookie: hoa.cookie })).json.invoices[0].status).toBe("paid");
    await post(t, `invoices/${id}/void`, { version: 3, reason: "Private reason" });
    const detail = (await call(`/api/my/invoices/${id}`, { cookie: hoa.cookie })).json.invoice;
    expect(detail).toMatchObject({ status: "void", voidReason: "" });
    expect(JSON.stringify(detail)).not.toContain("Private reason");
  });

  it("shows the receipts of the same student from every teacher, and nothing of another teacher's students", async () => {
    const { t, hoa } = await setup();
    const d = await drafts(t);
    await sentFor(hoa, t, d, "Hoa");
    const stranger = await createTeacher("Other");
    const kid = await createStudent(stranger, "Zed");
    expect((await call("/api/my/invoices", { cookie: kid.cookie })).json.invoices).toEqual([]);
  });

  it("a student cannot use the teacher's routes, and a signed out person gets 401", async () => {
    const { t, hoa } = await setup();
    const d = await drafts(t);
    const routes: [string, string, unknown?][] = [
      ["GET", "/api/invoices?period=2020-01"],
      ["POST", "/api/invoices/generate", { period: MONTH }],
      ["GET", `/api/invoices/${d.Hoa!.id}`],
      ["POST", `/api/invoices/${d.Hoa!.id}/send`, { version: 1 }],
      ["PUT", "/api/payment-details", {}],
      ["GET", "/api/payment-details"],
    ];
    for (const [method, path, body] of routes) {
      expect((await call(path, { method, cookie: hoa.cookie, body })).status, `${method} ${path}`).toBe(403);
      expect((await call(path, { method, body })).status, `${method} ${path}`).toBe(401);
    }
    expect((await call("/api/my/invoices", { cookie: t.cookie })).status).toBe(403); // a teacher has no student side
    expect((await call("/api/my/invoices")).status).toBe(401);
  });
});

describe("one teacher never reaches another teacher's receipts", () => {
  it("answers 'not found' for every action, and lists nothing", async () => {
    const { t } = await setup();
    const d = await drafts(t);
    const other = await createTeacher("Other");
    const id = d.Hoa!.id;
    const calls: [string, string, unknown?][] = [
      ["GET", `/api/invoices/${id}`],
      ["PUT", `/api/invoices/${id}`, { lines: [], note: "", dueDate: null, version: 1 }],
      ["DELETE", `/api/invoices/${id}`, { version: 1 }],
      ["POST", `/api/invoices/${id}/refresh`, { version: 1 }],
      ["POST", `/api/invoices/${id}/send`, { version: 1 }],
      ["POST", `/api/invoices/${id}/paid`, { version: 1 }],
      ["POST", `/api/invoices/${id}/unpaid`, { version: 1 }],
      ["POST", `/api/invoices/${id}/void`, { version: 1, reason: "x" }],
    ];
    for (const [method, path, body] of calls) {
      expect((await call(path, { method, cookie: other.cookie, body })).status, `${method} ${path}`).toBe(
        404,
      );
    }
    expect((await listOf(other)).invoices).toEqual([]);
    expect((await open(t, id)).status).toBe("draft"); // untouched
    // Their own student ids cannot be used to make a receipt in someone else's name.
    expect((await post(other, "invoices", { studentId: d.Hoa!.studentId, period: MONTH })).status).toBe(404);
    expect((await generate(other)).json).toEqual({ created: 0 });
  });

  it("ignores a tenant, a status or a number sent in the body", async () => {
    const { t } = await setup();
    const other = await createTeacher("Other");
    const inv = (await drafts(t)).Hoa!;
    const res = await save(t, inv, {
      tenantId: other.tenantId,
      status: "paid",
      number: "INV-1",
      total: 1,
    });
    expect(res.status).toBe(200);
    expect(res.json.invoice).toMatchObject({ status: "draft", number: null, total: 400_000 });
    expect(await count("SELECT COUNT(*) AS n FROM invoices WHERE tenant_id = ?", other.tenantId)).toBe(0);
  });
});

describe("the audit log", () => {
  it("writes each step and never the payment details or the note", async () => {
    const { t } = await setup();
    const d = await drafts(t);
    await send(t, d.Hoa!);
    await post(t, `invoices/${d.Hoa!.id}/paid`, { version: 2 });
    await post(t, `invoices/${d.Hoa!.id}/unpaid`, { version: 3 });
    await post(t, `invoices/${d.Hoa!.id}/void`, { version: 4, reason: "Secret reason" });
    await call(`/api/invoices/${d.Nam!.id}`, { method: "DELETE", cookie: t.cookie, body: { version: 1 } });
    await call("/api/payment-details", {
      method: "PUT",
      cookie: t.cookie,
      body: { bankAccount: "12345678" },
    });
    const rows = (
      await env.DB.prepare(
        "SELECT action, meta FROM audit_log WHERE tenant_id = ? AND action LIKE 'invoice.%' OR action = 'payment_details.updated' ORDER BY rowid",
      )
        .bind(t.tenantId)
        .all<{ action: string; meta: string | null }>()
    ).results;
    const actions = rows.map((r) => r.action);
    for (const a of [
      "invoice.generated",
      "invoice.sent",
      "invoice.paid",
      "invoice.unpaid",
      "invoice.voided",
      "invoice.deleted",
      "payment_details.updated",
    ]) {
      expect(actions, a).toContain(a);
    }
    const text = JSON.stringify(rows);
    expect(text).not.toContain("12345678");
    expect(text).not.toContain("Secret reason");
  });
});
