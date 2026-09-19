import type {
  CreateInvoiceBody,
  InvoiceInfo,
  InvoiceSummary,
  InvoiceLine,
  InvoiceListResult,
  MyInvoiceDetail,
  MyInvoiceItem,
  PaymentDetails,
  PaymentDetailsBody,
  UnbilledLesson,
  UnbilledStudent,
  UpdateInvoiceBody,
} from "@lms/shared";
import { requireTeacherTenant, type Actor } from "../auth/actor";
import { audit } from "../audit";
import { sendMail, type Ctx } from "../auth/service";
import { AppError } from "../lib/errors";
import { appUrl } from "../lib/config";
import { localToUtc, utcToLocal } from "../lib/zone";
import { authorize } from "../policy";
import {
  deleteDraftStatement,
  findInvoice,
  findMyInvoice,
  insertDraftsStatement,
  invoiceCounts,
  invoicesOfPeriod,
  myInvoices,
  paidStatement,
  paymentDetailsOf,
  pickLessons,
  sendStatement,
  setPaymentDetailsStatement,
  studentInTenant,
  stillAttended,
  studentsWithUnbilled,
  unbilledStudents,
  unpaidStatement,
  updateDraftStatement,
  voidedOfPeriod,
  voidStatement,
  type BillableRow,
  type InvoiceRow,
  type PaymentRow,
} from "../repos/invoices";
import { tenantTimezone } from "../repos/lessons";

/** A line as it is kept in the database. `lessons` are the lessons behind the line (with their start, UTC). */
interface StoredLine {
  id: string;
  courseId: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  lessons: { id: string; at: string }[];
}

const conflictText = "This receipt was changed since you opened it. Please open it again.";
const lineId = () => `l_${crypto.randomUUID().replaceAll("-", "").slice(0, 10)}`;

const parseLines = (text: string): StoredLine[] => {
  try {
    const v: unknown = JSON.parse(text);
    if (!Array.isArray(v)) return [];
    // Lines made before the teacher could pick lessons only know the start of each lesson.
    return (v as (StoredLine & { at?: string[] })[]).map((l) => ({
      ...l,
      lessons: l.lessons ?? (l.at ?? []).map((at) => ({ id: "", at })),
    }));
  } catch {
    return [];
  }
};

/** The first moment of a month and of the next month, in UTC, for the teacher's time zone. */
function monthBounds(period: string, zone: string): { from: string; to: string } {
  const [y, m] = period.split("-").map(Number) as [number, number];
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  return { from: localToUtc(`${period}-01`, "00:00", zone), to: localToUtc(`${next}-01`, "00:00", zone) };
}

/** One line for each course the student attended, worked out from the attendance. */
function linesFromLessons(rows: BillableRow[]): StoredLine[] {
  const byCourse = new Map<string, StoredLine>();
  for (const r of rows) {
    const line = byCourse.get(r.course_id) ?? {
      id: lineId(),
      courseId: r.course_id,
      description: r.course_name,
      quantity: 0,
      unitPrice: r.price,
      amount: 0,
      lessons: [],
    };
    line.quantity += 1;
    line.amount = line.quantity * line.unitPrice;
    line.lessons.push({ id: r.lesson_id, at: r.starts_at });
    byCourse.set(r.course_id, line);
  }
  return [...byCourse.values()];
}

const totalOf = (lines: StoredLine[]) => lines.reduce((sum, l) => sum + l.amount, 0);

/** Who the receipt is from: the name the teacher wants students to pay, else the name of their classroom. */
const senderOf = (r: { payee_name: string; teacher_name: string | null }) =>
  r.payee_name || r.teacher_name || "";

const paymentOf = (r: PaymentRow): PaymentDetails => ({
  payeeName: r.payee_name,
  payeePhone: r.payee_phone,
  bankName: r.bank_name,
  bankAccount: r.bank_account,
  bankHolder: r.bank_holder,
  paymentNote: r.payment_note,
});

interface Issued {
  teacherName: string;
  studentName: string;
  payee: PaymentDetails;
}
const parseIssued = (text: string | null): Issued | null => {
  try {
    return text ? (JSON.parse(text) as Issued) : null;
  } catch {
    return null;
  }
};

function shapeLines(lines: StoredLine[], zone: string): InvoiceLine[] {
  return lines.map((l) => ({
    id: l.id,
    courseId: l.courseId,
    description: l.description,
    quantity: l.quantity,
    unitPrice: l.unitPrice,
    amount: l.amount,
    // The days are shown only while they match the quantity (the teacher may have changed the quantity by hand).
    dates: l.lessons.length === l.quantity ? l.lessons.map((x) => utcToLocal(x.at, zone).date) : [],
  }));
}

/** The receipt as the teacher sees it. A sent one shows what was fixed when it was sent. */
function toInfo(r: InvoiceRow, zone: string, attendanceChanged: boolean): InvoiceInfo {
  const issued = parseIssued(r.issued);
  return {
    id: r.id,
    studentId: r.student_id,
    studentName: issued?.studentName ?? r.student_name,
    teacherName: issued?.teacherName ?? senderOf(r),
    period: r.period,
    number: r.number,
    status: r.status,
    lines: shapeLines(parseLines(r.lines), zone),
    total: r.total,
    note: r.note,
    dueDate: r.due_date,
    sentAt: r.sent_at,
    paidAt: r.paid_at,
    voidedAt: r.voided_at,
    voidReason: r.void_reason,
    version: r.version,
    payee: issued?.payee ?? paymentOf(r),
    attendanceChanged,
  };
}

/**
 * True when a receipt that was sent has a lesson that the student no longer attended (the attendance was changed, or the
 * lesson was cancelled). Lessons the student attended later are simply not on this receipt, so they do not count.
 */
async function attendanceChanged(ctx: Ctx, r: InvoiceRow): Promise<boolean> {
  if (r.status !== "sent" && r.status !== "paid") return false;
  const ids = parseLines(r.lines).flatMap((l) => l.lessons.map((x) => x.id).filter((id) => id !== ""));
  if (ids.length === 0) return false;
  const still = await stillAttended(ctx.env.DB, r.tenant_id, r.student_id, ids);
  return ids.some((id) => !still.has(id));
}

async function invoiceOf(ctx: Ctx, tenantId: string, id: string): Promise<InvoiceRow> {
  const r = await findInvoice(ctx.env.DB, tenantId, id);
  if (!r) throw new AppError("NOT_FOUND"); // also the answer for another teacher's receipt
  return r;
}

async function infoOf(ctx: Ctx, tenantId: string, id: string): Promise<InvoiceInfo> {
  const r = await invoiceOf(ctx, tenantId, id);
  const zone = await tenantTimezone(ctx.env.DB, tenantId);
  return toInfo(r, zone, await attendanceChanged(ctx, r));
}

// ------------------------------------------------------------------- lists

export async function invoiceList(ctx: Ctx, actor: Actor, period: string): Promise<InvoiceListResult> {
  const tenantId = requireTeacherTenant(actor);
  authorize(actor, "invoice", "read", { tenantId });
  const zone = await tenantTimezone(ctx.env.DB, tenantId);
  const { from, to } = monthBounds(period, zone);
  const map = (r: Awaited<ReturnType<typeof invoicesOfPeriod>>[number]) => ({
    id: r.id,
    studentId: r.student_id,
    studentName: r.student_name,
    period: r.period,
    number: r.number,
    status: r.status,
    total: r.total,
    sentAt: r.sent_at,
    paidAt: r.paid_at,
    version: r.version,
  });
  const [rows, cancelled, missing] = await Promise.all([
    invoicesOfPeriod(ctx.env.DB, tenantId, period),
    voidedOfPeriod(ctx.env.DB, tenantId, period),
    studentsWithUnbilled(ctx.env.DB, tenantId, from, to),
  ]);
  return { period, invoices: rows.map(map), cancelled: cancelled.map(map), missing };
}

// ----------------------------------------------------------------- creating

/** The month a receipt is filed under: the month (teacher's time zone) of a moment. */
const periodOf = (iso: string, zone: string) => utcToLocal(iso, zone).date.slice(0, 7);

/**
 * Makes a draft for every student who attended paid lessons this month that are on no receipt yet. The draft has
 * all of those lessons. Lessons that are already on a receipt are left alone.
 */
export async function generate(ctx: Ctx, actor: Actor, period: string): Promise<{ created: number }> {
  const db = ctx.env.DB;
  const tenantId = requireTeacherTenant(actor);
  authorize(actor, "invoice", "create", { tenantId });
  const zone = await tenantTimezone(db, tenantId);
  const { from, to } = monthBounds(period, zone);
  const rows = await pickLessons(db, {
    tenantId,
    fromUtc: from,
    toUtc: to,
    studentId: null,
    lessonIds: null,
    selfInvoice: null,
    limit: 20000,
  });
  const byStudent = new Map<string, BillableRow[]>();
  for (const r of rows) byStudent.set(r.student_id, [...(byStudent.get(r.student_id) ?? []), r]);
  const drafts = [...byStudent.entries()].map(([studentId, list]) => {
    const lines = linesFromLessons(list);
    return { id: crypto.randomUUID(), studentId, period, lines, total: totalOf(lines) };
  });
  if (drafts.length === 0) return { created: 0 };
  const res = await insertDraftsStatement(db, { tenantId, userId: actor.userId, drafts }).run();
  const created = res.meta.changes ?? 0;
  await audit(db, {
    action: "invoice.generated",
    actorUserId: actor.userId,
    tenantId,
    targetType: "invoice_period",
    targetId: period,
    ipHash: ctx.ipHash,
    meta: { created },
  });
  return { created };
}

const cannotBill = () =>
  new AppError("CONFLICT", {
    message:
      "Some of these lessons cannot be charged. They may already be on another receipt, or the student did not attend them. Please choose the lessons again.",
  });

/** The lessons the teacher picked for a student, checked one by one. */
async function pickedRows(ctx: Ctx, tenantId: string, studentId: string, ids: string[], self: string | null) {
  const wanted = [...new Set(ids)];
  if (wanted.length === 0) return [];
  const rows = await pickLessons(ctx.env.DB, {
    tenantId,
    fromUtc: null,
    toUtc: null,
    studentId,
    lessonIds: wanted,
    selfInvoice: self,
    limit: wanted.length,
  });
  if (rows.length !== wanted.length) throw cannotBill();
  return rows;
}

/**
 * A draft for the lessons the teacher picked. It is filed under the month of the latest lesson. With no lessons it is
 * an empty draft for the month the teacher gave, to fill in by hand.
 */
export async function createOne(ctx: Ctx, actor: Actor, body: CreateInvoiceBody): Promise<InvoiceInfo> {
  const db = ctx.env.DB;
  const tenantId = requireTeacherTenant(actor);
  authorize(actor, "invoice", "create", { tenantId });
  if (!(await studentInTenant(db, tenantId, body.studentId))) throw new AppError("NOT_FOUND");
  const zone = await tenantTimezone(db, tenantId);
  const rows = await pickedRows(ctx, tenantId, body.studentId, body.lessonIds ?? [], null);
  const latest = rows.reduce((m, r) => (r.starts_at > m ? r.starts_at : m), "");
  const period = latest ? periodOf(latest, zone) : body.period!;
  const lines = linesFromLessons(rows);
  const id = crypto.randomUUID();
  const res = await insertDraftsStatement(db, {
    tenantId,
    userId: actor.userId,
    drafts: [{ id, studentId: body.studentId, period, lines, total: totalOf(lines) }],
  }).run();
  if (!res.meta.changes) throw cannotBill(); // a lesson went onto another receipt a moment ago
  await audit(db, {
    action: "invoice.created",
    actorUserId: actor.userId,
    tenantId,
    targetType: "invoice",
    targetId: id,
    ipHash: ctx.ipHash,
    meta: { lessons: rows.length },
  });
  return infoOf(ctx, tenantId, id);
}

const localLesson = (iso: string, zone: string) => utcToLocal(iso, zone);

/** Students with lessons that are on no receipt yet. */
export async function unbilledList(ctx: Ctx, actor: Actor): Promise<UnbilledStudent[]> {
  const tenantId = requireTeacherTenant(actor);
  authorize(actor, "invoice", "read", { tenantId });
  return (await unbilledStudents(ctx.env.DB, tenantId)).map((r) => ({
    studentId: r.student_id,
    name: r.name,
    lessons: r.lessons,
    amount: r.amount,
  }));
}

/**
 * The lessons of one student that can go on a receipt. With `invoiceId` (a draft), the lessons of that draft are in the
 * list too and are marked.
 */
export async function unbilledLessons(
  ctx: Ctx,
  actor: Actor,
  studentId: string,
  invoiceId: string | null,
): Promise<UnbilledLesson[]> {
  const tenantId = requireTeacherTenant(actor);
  authorize(actor, "invoice", "read", { tenantId });
  if (!(await studentInTenant(ctx.env.DB, tenantId, studentId))) throw new AppError("NOT_FOUND");
  let mine = new Set<string>();
  if (invoiceId) {
    const inv = await invoiceOf(ctx, tenantId, invoiceId);
    if (inv.student_id !== studentId) throw new AppError("NOT_FOUND");
    mine = new Set(parseLines(inv.lines).flatMap((l) => l.lessons.map((x) => x.id)));
  }
  const zone = await tenantTimezone(ctx.env.DB, tenantId);
  const rows = await pickLessons(ctx.env.DB, {
    tenantId,
    fromUtc: null,
    toUtc: null,
    studentId,
    lessonIds: null,
    selfInvoice: invoiceId,
    limit: 500,
  });
  return rows.map((r) => {
    const at = localLesson(r.starts_at, zone);
    return {
      lessonId: r.lesson_id,
      courseId: r.course_id,
      courseName: r.course_name,
      title: r.lesson_title,
      date: at.date,
      startTime: at.time,
      price: r.price,
      inThisReceipt: mine.has(r.lesson_id),
    };
  });
}

// --------------------------------------------------------------- one receipt

export async function invoiceGet(ctx: Ctx, actor: Actor, id: string): Promise<InvoiceInfo> {
  const tenantId = requireTeacherTenant(actor);
  authorize(actor, "invoice", "read", { tenantId });
  return infoOf(ctx, tenantId, id);
}

function lockedIf(r: InvoiceRow): void {
  if (r.status !== "draft") throw new AppError("INVOICE_LOCKED");
}

export async function invoiceUpdate(
  ctx: Ctx,
  actor: Actor,
  id: string,
  body: UpdateInvoiceBody,
): Promise<InvoiceInfo> {
  const db = ctx.env.DB;
  const tenantId = requireTeacherTenant(actor);
  authorize(actor, "invoice", "update", { tenantId });
  const current = await invoiceOf(ctx, tenantId, id);
  lockedIf(current);
  if (current.version !== body.version) throw new AppError("CONFLICT", { message: conflictText });

  // A line that already exists keeps the lessons behind it, as long as its quantity did not change.
  const before = new Map(parseLines(current.lines).map((l) => [l.id, l]));
  const used = new Set<string>();
  const lines: StoredLine[] = body.lines.map((l) => {
    const old = l.id !== undefined && !used.has(l.id) ? before.get(l.id) : undefined;
    const lineIdNow = old ? old.id : lineId();
    used.add(lineIdNow);
    return {
      id: lineIdNow,
      courseId: old?.courseId ?? null,
      description: l.description,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      amount: l.quantity * l.unitPrice,
      lessons: old ? old.lessons : [], // the lessons stay on this receipt, so they cannot be charged again
    };
  });
  const total = totalOf(lines);
  if (total < 0) {
    throw new AppError("VALIDATION_FAILED", { fields: { lines: "The total cannot be below 0." } });
  }
  const changed = await updateDraftStatement(db, {
    tenantId,
    id,
    version: body.version,
    lines,
    total,
    note: body.note,
    dueDate: body.dueDate,
  }).run();
  if (!changed.meta.changes) throw new AppError("CONFLICT", { message: conflictText });
  return infoOf(ctx, tenantId, id);
}

/**
 * Changes which lessons a draft is made from. The lines that came from lessons are worked out again (with today's prices);
 * the lines the teacher added by hand stay. Choosing the same lessons again works the lines out from the attendance again.
 */
export async function invoiceSetLessons(
  ctx: Ctx,
  actor: Actor,
  id: string,
  body: { lessonIds: string[]; version: number },
): Promise<InvoiceInfo> {
  const db = ctx.env.DB;
  const tenantId = requireTeacherTenant(actor);
  authorize(actor, "invoice", "update", { tenantId });
  const current = await invoiceOf(ctx, tenantId, id);
  lockedIf(current);
  if (current.version !== body.version) throw new AppError("CONFLICT", { message: conflictText });
  const rows = await pickedRows(ctx, tenantId, current.student_id, body.lessonIds, id);
  const lines = [...linesFromLessons(rows), ...parseLines(current.lines).filter((l) => l.courseId === null)];
  const changed = await updateDraftStatement(db, {
    tenantId,
    id,
    version: body.version,
    lines,
    total: totalOf(lines),
    note: current.note,
    dueDate: current.due_date,
  }).run();
  if (!changed.meta.changes) throw new AppError("CONFLICT", { message: conflictText });
  return infoOf(ctx, tenantId, id);
}

export async function invoiceDelete(ctx: Ctx, actor: Actor, id: string, version: number): Promise<void> {
  const db = ctx.env.DB;
  const tenantId = requireTeacherTenant(actor);
  authorize(actor, "invoice", "delete", { tenantId });
  const current = await invoiceOf(ctx, tenantId, id);
  lockedIf(current);
  if (current.version !== version) throw new AppError("CONFLICT", { message: conflictText });
  const res = await deleteDraftStatement(db, tenantId, id, version).run();
  if (!res.meta.changes) throw new AppError("CONFLICT", { message: conflictText });
  await audit(db, {
    action: "invoice.deleted",
    actorUserId: actor.userId,
    tenantId,
    targetType: "invoice",
    targetId: id,
    ipHash: ctx.ipHash,
  });
}

// ------------------------------------------------------------ sending and paying

const monthName = (period: string) =>
  new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${period}-01T00:00:00Z`),
  );

/**
 * Sends the receipt: from now on the student can see it and it cannot be changed. It gets its number and keeps
 * the names and payment details of this moment. The student also gets an email with a link.
 */
export async function invoiceSend(ctx: Ctx, actor: Actor, id: string, version: number): Promise<InvoiceInfo> {
  const db = ctx.env.DB;
  const tenantId = requireTeacherTenant(actor);
  authorize(actor, "invoice", "send", { tenantId });
  const current = await invoiceOf(ctx, tenantId, id);
  lockedIf(current);
  if (current.version !== version) throw new AppError("CONFLICT", { message: conflictText });
  if (current.total <= 0) {
    throw new AppError("CONFLICT", {
      message: "Add a line with an amount to pay before you send this receipt.",
    });
  }
  const issued: Issued = {
    teacherName: senderOf(current) || actor.name,
    studentName: current.student_name,
    payee: paymentOf(current),
  };
  const res = await sendStatement(db, { tenantId, id, version, issued }).run();
  if (!res.meta.changes) throw new AppError("CONFLICT", { message: conflictText });
  await audit(db, {
    action: "invoice.sent",
    actorUserId: actor.userId,
    tenantId,
    targetType: "invoice",
    targetId: id,
    ipHash: ctx.ipHash,
    meta: { total: current.total },
  });
  await sendMail(ctx, {
    kind: "invoice",
    to: current.student_email,
    subject: `Your fee receipt for ${monthName(current.period)}`,
    text: [
      `Hello ${current.student_name},`,
      "",
      `${issued.teacherName} sent you a fee receipt for ${monthName(current.period)}.`,
      "You can open it here and print it:",
      `${appUrl(ctx.env)}/my/invoices/${id}`,
      "",
      "You need to sign in with this email address.",
    ].join("\n"),
  });
  return infoOf(ctx, tenantId, id);
}

async function change(
  ctx: Ctx,
  actor: Actor,
  id: string,
  version: number,
  action: "paid" | "unpaid",
): Promise<InvoiceInfo> {
  const db = ctx.env.DB;
  const tenantId = requireTeacherTenant(actor);
  authorize(actor, "invoice", "update", { tenantId });
  const current = await invoiceOf(ctx, tenantId, id);
  if (current.version !== version) throw new AppError("CONFLICT", { message: conflictText });
  const statement = action === "paid" ? paidStatement : unpaidStatement;
  const res = await statement(db, tenantId, id, version).run();
  if (!res.meta.changes) {
    throw new AppError("CONFLICT", {
      message:
        action === "paid"
          ? "Only a receipt that was sent and is not paid yet can be marked as paid."
          : "Only a paid receipt can be marked as not paid.",
    });
  }
  await audit(db, {
    action: `invoice.${action}`,
    actorUserId: actor.userId,
    tenantId,
    targetType: "invoice",
    targetId: id,
    ipHash: ctx.ipHash,
  });
  return infoOf(ctx, tenantId, id);
}

export const invoicePaid = (ctx: Ctx, actor: Actor, id: string, version: number) =>
  change(ctx, actor, id, version, "paid");
export const invoiceUnpaid = (ctx: Ctx, actor: Actor, id: string, version: number) =>
  change(ctx, actor, id, version, "unpaid");

/** A receipt that was sent is not changed. It is cancelled (with a reason), and a new one can be made. */
export async function invoiceVoid(
  ctx: Ctx,
  actor: Actor,
  id: string,
  body: { reason: string; version: number },
): Promise<InvoiceInfo> {
  const db = ctx.env.DB;
  const tenantId = requireTeacherTenant(actor);
  authorize(actor, "invoice", "update", { tenantId });
  const current = await invoiceOf(ctx, tenantId, id);
  if (current.version !== body.version) throw new AppError("CONFLICT", { message: conflictText });
  const res = await voidStatement(db, { tenantId, id, version: body.version, reason: body.reason }).run();
  if (!res.meta.changes) {
    throw new AppError("CONFLICT", {
      message: "Only a receipt that was sent can be cancelled. A draft can be deleted.",
    });
  }
  await audit(db, {
    action: "invoice.voided",
    actorUserId: actor.userId,
    tenantId,
    targetType: "invoice",
    targetId: id,
    ipHash: ctx.ipHash,
    meta: { wasPaid: current.status === "paid" },
  });
  return infoOf(ctx, tenantId, id);
}

// ---------------------------------------------------------- payment details

export async function paymentGet(ctx: Ctx, actor: Actor): Promise<PaymentDetails> {
  const tenantId = requireTeacherTenant(actor);
  authorize(actor, "invoice", "read", { tenantId });
  const r = await paymentDetailsOf(ctx.env.DB, tenantId);
  if (!r) throw new AppError("NOT_FOUND");
  return paymentOf(r);
}

export async function paymentSet(ctx: Ctx, actor: Actor, body: PaymentDetailsBody): Promise<PaymentDetails> {
  const tenantId = requireTeacherTenant(actor);
  authorize(actor, "invoice", "update", { tenantId });
  await setPaymentDetailsStatement(ctx.env.DB, tenantId, {
    payeeName: body.payeeName,
    payeePhone: body.payeePhone,
    bankName: body.bankName,
    bankAccount: body.bankAccount,
    bankHolder: body.bankHolder,
    paymentNote: body.paymentNote,
  }).run();
  await audit(ctx.env.DB, {
    action: "payment_details.updated",
    actorUserId: actor.userId,
    tenantId,
    ipHash: ctx.ipHash,
  });
  return paymentGet(ctx, actor);
}

// ------------------------------------------------------------ the student's side

export async function myInvoiceList(ctx: Ctx, actor: Actor): Promise<MyInvoiceItem[]> {
  return (await myInvoices(ctx.env.DB, actor.userId)).map((r) => ({
    id: r.id,
    studentId: r.student_id,
    studentName: r.student_name,
    period: r.period,
    number: r.number,
    status: r.status,
    total: r.total,
    sentAt: r.sent_at,
    paidAt: r.paid_at,
    teacherName: parseIssued(r.issued)?.teacherName ?? r.teacher_name,
  }));
}

export async function myInvoiceGet(ctx: Ctx, actor: Actor, id: string): Promise<MyInvoiceDetail> {
  const r = await findMyInvoice(ctx.env.DB, actor.userId, id);
  if (!r) throw new AppError("NOT_FOUND"); // the same answer for a receipt of someone else, a draft, or one that does not exist
  authorize(actor, "invoice", "read", {
    tenantId: r.tenant_id,
    ownerUserId: actor.userId,
    courseStudentUserIds: [actor.userId],
  });
  const zone = await tenantTimezone(ctx.env.DB, r.tenant_id);
  const issued = parseIssued(r.issued);
  return {
    id: r.id,
    studentId: r.student_id,
    studentName: issued?.studentName ?? r.student_name,
    teacherName: issued?.teacherName ?? r.teacher_name,
    period: r.period,
    number: r.number,
    status: r.status,
    lines: shapeLines(parseLines(r.lines), zone),
    total: r.total,
    note: r.note,
    dueDate: r.due_date,
    sentAt: r.sent_at,
    paidAt: r.paid_at,
    voidedAt: r.voided_at,
    voidReason: "", // why the teacher cancelled it is the teacher's business
    version: r.version,
    payee: issued?.payee ?? {
      payeeName: "",
      payeePhone: "",
      bankName: "",
      bankAccount: "",
      bankHolder: "",
      paymentNote: "",
    },
  };
}

export async function invoiceSummary(ctx: Ctx, actor: Actor): Promise<InvoiceSummary> {
  const tenantId = requireTeacherTenant(actor);
  authorize(actor, "invoice", "read", { tenantId });
  const [counts, students] = await Promise.all([
    invoiceCounts(ctx.env.DB, tenantId),
    unbilledStudents(ctx.env.DB, tenantId),
  ]);
  return {
    toCharge: students.length,
    drafts: counts?.drafts ?? 0,
    unpaid: counts?.unpaid ?? 0,
    unpaidAmount: counts?.unpaid_amount ?? 0,
  };
}
