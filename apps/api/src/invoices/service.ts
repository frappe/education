import type {
  CreateInvoiceBody,
  InvoiceInfo,
  InvoiceLine,
  InvoiceListResult,
  MyInvoiceDetail,
  MyInvoiceItem,
  PaymentDetails,
  PaymentDetailsBody,
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
  billableLessons,
  deleteDraftStatement,
  findInvoice,
  findMyInvoice,
  insertDraftsStatement,
  invoicesOfPeriod,
  myInvoices,
  paidStatement,
  paymentDetailsOf,
  sendStatement,
  setPaymentDetailsStatement,
  studentInTenant,
  studentsWithoutInvoice,
  unpaidStatement,
  updateDraftStatement,
  voidedOfPeriod,
  voidStatement,
  type BillableRow,
  type InvoiceRow,
  type PaymentRow,
} from "../repos/invoices";
import { tenantTimezone } from "../repos/lessons";

/** A line as it is kept in the database. `at` holds the start (UTC) of each lesson behind the line. */
interface StoredLine {
  id: string;
  courseId: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  at: string[];
}

const conflictText = "This receipt was changed since you opened it. Please open it again.";
const lineId = () => `l_${crypto.randomUUID().replaceAll("-", "").slice(0, 10)}`;

const parseLines = (text: string): StoredLine[] => {
  try {
    const v: unknown = JSON.parse(text);
    return Array.isArray(v) ? (v as StoredLine[]) : [];
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
      at: [],
    };
    line.quantity += 1;
    line.amount = line.quantity * line.unitPrice;
    line.at.push(r.starts_at);
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
    dates: (l.at ?? []).map((iso) => utcToLocal(iso, zone).date),
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
 * True when a receipt that was sent was built from lessons and the attendance of those lessons is different now
 * (a lesson was added or removed). Lines the teacher changed by hand are left out of this check.
 */
async function attendanceChanged(ctx: Ctx, r: InvoiceRow, zone: string): Promise<boolean> {
  if (r.status !== "sent" && r.status !== "paid") return false;
  const lines = parseLines(r.lines).filter((l) => l.courseId !== null && l.at?.length > 0);
  if (lines.length === 0) return false;
  const { from, to } = monthBounds(r.period, zone);
  const now = await billableLessons(ctx.env.DB, r.tenant_id, from, to, r.student_id);
  return lines.some((l) => {
    const current = now
      .filter((x) => x.course_id === l.courseId)
      .map((x) => x.starts_at)
      .sort();
    const then = [...l.at].sort();
    return current.length !== then.length || current.some((v, i) => v !== then[i]);
  });
}

async function invoiceOf(ctx: Ctx, tenantId: string, id: string): Promise<InvoiceRow> {
  const r = await findInvoice(ctx.env.DB, tenantId, id);
  if (!r) throw new AppError("NOT_FOUND"); // also the answer for another teacher's receipt
  return r;
}

async function infoOf(ctx: Ctx, tenantId: string, id: string): Promise<InvoiceInfo> {
  const r = await invoiceOf(ctx, tenantId, id);
  const zone = await tenantTimezone(ctx.env.DB, tenantId);
  return toInfo(r, zone, await attendanceChanged(ctx, r, zone));
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
    studentsWithoutInvoice(ctx.env.DB, tenantId, period, from, to),
  ]);
  return { period, invoices: rows.map(map), cancelled: cancelled.map(map), missing };
}

// ----------------------------------------------------------------- creating

/** Makes a draft for every student who attended a paid lesson this month and has no receipt yet. */
export async function generate(ctx: Ctx, actor: Actor, period: string): Promise<{ created: number }> {
  const db = ctx.env.DB;
  const tenantId = requireTeacherTenant(actor);
  authorize(actor, "invoice", "create", { tenantId });
  const zone = await tenantTimezone(db, tenantId);
  const { from, to } = monthBounds(period, zone);
  const rows = await billableLessons(db, tenantId, from, to, null);
  const byStudent = new Map<string, BillableRow[]>();
  for (const r of rows) byStudent.set(r.student_id, [...(byStudent.get(r.student_id) ?? []), r]);
  const drafts = [...byStudent.entries()].map(([studentId, list]) => {
    const lines = linesFromLessons(list);
    return { id: crypto.randomUUID(), studentId, lines, total: totalOf(lines) };
  });
  if (drafts.length === 0) return { created: 0 };
  const res = await insertDraftsStatement(db, { tenantId, userId: actor.userId, period, drafts }).run();
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

/** A draft for one student, even if they have no lessons yet (the teacher can add lines by hand). */
export async function createOne(ctx: Ctx, actor: Actor, body: CreateInvoiceBody): Promise<InvoiceInfo> {
  const db = ctx.env.DB;
  const tenantId = requireTeacherTenant(actor);
  authorize(actor, "invoice", "create", { tenantId });
  const zone = await tenantTimezone(db, tenantId);
  const { from, to } = monthBounds(body.period, zone);
  const lines = linesFromLessons(await billableLessons(db, tenantId, from, to, body.studentId));
  const id = crypto.randomUUID();
  const res = await insertDraftsStatement(db, {
    tenantId,
    userId: actor.userId,
    period: body.period,
    drafts: [{ id, studentId: body.studentId, lines, total: totalOf(lines) }],
  }).run();
  if (!res.meta.changes) {
    // Either no such student in this teacher's list, or the student already has a receipt for the month.
    if (!(await studentInTenant(db, tenantId, body.studentId))) throw new AppError("NOT_FOUND");
    throw new AppError("CONFLICT", { message: "This student already has a receipt for this month." });
  }
  await audit(db, {
    action: "invoice.created",
    actorUserId: actor.userId,
    tenantId,
    targetType: "invoice",
    targetId: id,
    ipHash: ctx.ipHash,
  });
  return infoOf(ctx, tenantId, id);
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
      at: old && old.quantity === l.quantity ? old.at : [],
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

/** Works the lines out from the attendance again. Lines the teacher added by hand stay. */
export async function invoiceRefresh(
  ctx: Ctx,
  actor: Actor,
  id: string,
  version: number,
): Promise<InvoiceInfo> {
  const db = ctx.env.DB;
  const tenantId = requireTeacherTenant(actor);
  authorize(actor, "invoice", "update", { tenantId });
  const current = await invoiceOf(ctx, tenantId, id);
  lockedIf(current);
  if (current.version !== version) throw new AppError("CONFLICT", { message: conflictText });
  const zone = await tenantTimezone(db, tenantId);
  const { from, to } = monthBounds(current.period, zone);
  const lines = [
    ...linesFromLessons(await billableLessons(db, tenantId, from, to, current.student_id)),
    ...parseLines(current.lines).filter((l) => l.courseId === null),
  ];
  const changed = await updateDraftStatement(db, {
    tenantId,
    id,
    version,
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
