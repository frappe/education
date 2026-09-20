import type { InvoiceStatus } from "@lms/shared";
import { nowIso } from "../lib/time";

export interface InvoiceRow {
  id: string;
  tenant_id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  teacher_name: string | null;
  period: string;
  number: string | null;
  status: InvoiceStatus;
  lines: string;
  total: number;
  note: string;
  due_date: string | null;
  issued: string | null;
  sent_at: string | null;
  paid_at: string | null;
  voided_at: string | null;
  void_reason: string;
  version: number;
  // The payment details the teacher has now (used for a draft).
  payee_name: string;
  payee_phone: string;
  bank_name: string;
  bank_bin: string;
  bank_account: string;
  bank_holder: string;
  payment_note: string;
}

const COLUMNS = `i.id, i.tenant_id, i.student_id, s.name AS student_name, s.email AS student_email, i.period, i.number,
  i.status, i.lines, i.total, i.note, i.due_date, i.issued, i.sent_at, i.paid_at, i.voided_at, i.void_reason, i.version,
  t.name AS teacher_name, t.payee_name, t.payee_phone, t.bank_name, t.bank_bin, t.bank_account, t.bank_holder, t.payment_note`;
const FROM = `FROM invoices i
  JOIN students s ON s.id = i.student_id AND s.tenant_id = i.tenant_id
  JOIN tenants t ON t.id = i.tenant_id`;

/** Every invoice query takes the tenant id, so another teacher's receipt is never returned. */
export const findInvoice = (db: D1Database, tenantId: string, id: string) =>
  db
    .prepare(`SELECT ${COLUMNS} ${FROM} WHERE i.tenant_id = ? AND i.id = ?`)
    .bind(tenantId, id)
    .first<InvoiceRow>();

export async function invoicesOfPeriod(db: D1Database, tenantId: string, period: string) {
  const res = await db
    .prepare(
      `SELECT i.id, i.student_id, s.name AS student_name, i.period, i.number, i.status, i.total, i.sent_at, i.paid_at, i.version
       FROM invoices i JOIN students s ON s.id = i.student_id AND s.tenant_id = i.tenant_id
       WHERE i.tenant_id = ? AND i.period = ? AND i.status != 'void'
       ORDER BY s.name COLLATE NOCASE, i.id`,
    )
    .bind(tenantId, period)
    .all<{
      id: string;
      student_id: string;
      student_name: string;
      period: string;
      number: string | null;
      status: InvoiceStatus;
      total: number;
      sent_at: string | null;
      paid_at: string | null;
      version: number;
    }>();
  return res.results;
}

/** Cancelled receipts of one month, so the teacher can still find them. */
export async function voidedOfPeriod(db: D1Database, tenantId: string, period: string) {
  const res = await db
    .prepare(
      `SELECT i.id, i.student_id, s.name AS student_name, i.period, i.number, i.status, i.total, i.sent_at, i.paid_at, i.version
       FROM invoices i JOIN students s ON s.id = i.student_id AND s.tenant_id = i.tenant_id
       WHERE i.tenant_id = ? AND i.period = ? AND i.status = 'void'
       ORDER BY i.number, i.id`,
    )
    .bind(tenantId, period)
    .all<{
      id: string;
      student_id: string;
      student_name: string;
      period: string;
      number: string | null;
      status: InvoiceStatus;
      total: number;
      sent_at: string | null;
      paid_at: string | null;
      version: number;
    }>();
  return res.results;
}

export interface BillableRow {
  student_id: string;
  lesson_id: string;
  lesson_title: string;
  course_id: string;
  course_name: string;
  price: number;
  starts_at: string;
}

/**
 * True (in SQL) when the lesson is already on a receipt of this student that is not cancelled. The receipt named
 * by `self` is not counted (a draft that is being changed can keep its own lessons). Fixed text; the four pieces
 * are names of columns or parameters written in this file.
 */
const billedElsewhere = (lesson: string, student: string, tenant: string, self: string) =>
  `EXISTS (SELECT 1 FROM invoices o, json_each(o.lines) ol, json_each(ol.value, '$.lessons') ox
     WHERE o.tenant_id = ${tenant} AND o.student_id = ${student} AND o.status != 'void' AND o.id IS NOT ${self}
       AND json_extract(ox.value, '$.id') = ${lesson})`;
const BILLED_PICK = billedElsewhere("l.id", "a.student_id", "a.tenant_id", "?6");
const BILLED_ANY = billedElsewhere("l.id", "a.student_id", "a.tenant_id", "NULL");

/**
 * Lessons a student attended that can go on a receipt: attended (never absent), not cancelled, not free, and not
 * on another receipt. Narrow it with a time range, one student, and/or a list of lesson ids (JSON). The price is
 * the student's own price for the course if there is one, else the course price. `selfInvoice` is a draft whose own
 * lessons are allowed too.
 */
export async function pickLessons(
  db: D1Database,
  o: {
    tenantId: string;
    fromUtc: string | null;
    toUtc: string | null;
    studentId: string | null;
    lessonIds: string[] | null;
    selfInvoice: string | null;
    limit: number;
  },
) {
  const res = await db
    .prepare(
      `SELECT a.student_id, l.id AS lesson_id, l.title AS lesson_title, l.course_id, c.name AS course_name,
         COALESCE(e.custom_price, c.price_per_lesson) AS price, l.starts_at
       FROM attendance a
       JOIN lessons l ON l.id = a.lesson_id AND l.tenant_id = a.tenant_id
       JOIN courses c ON c.id = l.course_id AND c.tenant_id = l.tenant_id
       LEFT JOIN enrollments e ON e.tenant_id = l.tenant_id AND e.course_id = l.course_id AND e.student_id = a.student_id
       WHERE a.tenant_id = ?1 AND a.status = 'attended' AND l.status != 'cancelled'
         AND (?2 IS NULL OR l.starts_at >= ?2) AND (?3 IS NULL OR l.starts_at < ?3)
         AND (?4 IS NULL OR a.student_id = ?4)
         AND (?5 IS NULL OR l.id IN (SELECT value FROM json_each(?5)))
         AND COALESCE(e.custom_price, c.price_per_lesson) > 0
         AND NOT ${BILLED_PICK}
       ORDER BY a.student_id, l.starts_at, l.id LIMIT ?7`,
    )
    .bind(
      o.tenantId,
      o.fromUtc,
      o.toUtc,
      o.studentId,
      o.lessonIds === null ? null : JSON.stringify(o.lessonIds),
      o.selfInvoice,
      o.limit,
    )
    .all<BillableRow>();
  return res.results;
}

/** Students with attended lessons that are on no receipt yet, with how many lessons and what they cost. */
export async function unbilledStudents(db: D1Database, tenantId: string) {
  const res = await db
    .prepare(
      `SELECT s.id AS student_id, s.name, COUNT(*) AS lessons, SUM(COALESCE(e.custom_price, c.price_per_lesson)) AS amount
       FROM attendance a
       JOIN lessons l ON l.id = a.lesson_id AND l.tenant_id = a.tenant_id
       JOIN courses c ON c.id = l.course_id AND c.tenant_id = l.tenant_id
       JOIN students s ON s.id = a.student_id AND s.tenant_id = a.tenant_id
       LEFT JOIN enrollments e ON e.tenant_id = l.tenant_id AND e.course_id = l.course_id AND e.student_id = a.student_id
       WHERE a.tenant_id = ?1 AND a.status = 'attended' AND l.status != 'cancelled'
         AND COALESCE(e.custom_price, c.price_per_lesson) > 0 AND NOT ${BILLED_ANY}
       GROUP BY s.id ORDER BY s.name COLLATE NOCASE, s.id`,
    )
    .bind(tenantId)
    .all<{ student_id: string; name: string; lessons: number; amount: number }>();
  return res.results;
}

/** Of these lessons, the ones the student still attended (and that are not cancelled). */
export async function stillAttended(
  db: D1Database,
  tenantId: string,
  studentId: string,
  lessonIds: string[],
) {
  const res = await db
    .prepare(
      `SELECT l.id FROM attendance a JOIN lessons l ON l.id = a.lesson_id AND l.tenant_id = a.tenant_id
       WHERE a.tenant_id = ?1 AND a.student_id = ?2 AND a.status = 'attended' AND l.status != 'cancelled'
         AND l.id IN (SELECT value FROM json_each(?3))`,
    )
    .bind(tenantId, studentId, JSON.stringify(lessonIds))
    .all<{ id: string }>();
  return new Set(res.results.map((r) => r.id));
}

/** Of these course ids, the ones that belong to this teacher. */
export async function ownCourseIds(db: D1Database, tenantId: string, ids: string[]) {
  if (ids.length === 0) return new Set<string>();
  const res = await db
    .prepare(`SELECT id FROM courses WHERE tenant_id = ?1 AND id IN (SELECT value FROM json_each(?2))`)
    .bind(tenantId, JSON.stringify(ids))
    .all<{ id: string }>();
  return new Set(res.results.map((r) => r.id));
}

/**
 * True (in SQL) when a list of lines (JSON) has a lesson that is already on another receipt of the student that is
 * not cancelled. Used to make the database itself refuse to bill a lesson twice, even when two requests arrive at once.
 */
const linesTakenElsewhere = (lines: string, student: string, tenant: string, self: string) =>
  `EXISTS (SELECT 1 FROM json_each(${lines}) ln, json_each(ln.value, '$.lessons') x, invoices o,
       json_each(o.lines) ol, json_each(ol.value, '$.lessons') ox
     WHERE o.tenant_id = ${tenant} AND o.student_id = ${student} AND o.status != 'void' AND o.id != ${self}
       AND json_extract(ox.value, '$.id') = json_extract(x.value, '$.id'))`;
const TAKEN_ON_INSERT = linesTakenElsewhere("json_extract(j.value, '$.lines')", "s.id", "s.tenant_id", "''");
const TAKEN_ON_UPDATE = linesTakenElsewhere("?1", "invoices.student_id", "invoices.tenant_id", "invoices.id");

/**
 * Makes draft receipts in ONE statement. A draft with a lesson that is already on another receipt is skipped by
 * the statement itself, and so is a student who is not in this tenant. `meta.changes` is the number of new drafts.
 */
export const insertDraftsStatement = (
  db: D1Database,
  o: {
    tenantId: string;
    userId: string;
    drafts: { id: string; studentId: string; period: string; lines: unknown[]; total: number }[];
  },
): D1PreparedStatement =>
  db
    .prepare(
      `INSERT INTO invoices (id, tenant_id, student_id, period, lines, total, status, version, created_by, created_at, updated_at)
       SELECT json_extract(j.value, '$.id'), s.tenant_id, s.id, json_extract(j.value, '$.period'), json_extract(j.value, '$.lines'),
         json_extract(j.value, '$.total'), 'draft', 1, ?2, ?3, ?3
       FROM json_each(?1) j JOIN students s ON s.tenant_id = ?4 AND s.id = json_extract(j.value, '$.studentId')
       WHERE NOT ${TAKEN_ON_INSERT}`,
    )
    .bind(JSON.stringify(o.drafts), o.userId, nowIso(), o.tenantId);

/**
 * Saves the lines, note and due date of a draft, only if it is still the version the teacher looked at and none of
 * its lessons is on another receipt.
 */
export const updateDraftStatement = (
  db: D1Database,
  o: {
    tenantId: string;
    id: string;
    version: number;
    lines: unknown[];
    total: number;
    note: string;
    dueDate: string | null;
  },
): D1PreparedStatement =>
  db
    .prepare(
      `UPDATE invoices SET lines = ?1, total = ?2, note = ?3, due_date = ?4, version = version + 1, updated_at = ?5
       WHERE tenant_id = ?6 AND id = ?7 AND version = ?8 AND status = 'draft' AND NOT ${TAKEN_ON_UPDATE}`,
    )
    .bind(JSON.stringify(o.lines), o.total, o.note, o.dueDate, nowIso(), o.tenantId, o.id, o.version);

export const deleteDraftStatement = (db: D1Database, tenantId: string, id: string, version: number) =>
  db
    .prepare(`DELETE FROM invoices WHERE tenant_id = ? AND id = ? AND version = ? AND status = 'draft'`)
    .bind(tenantId, id, version);

/**
 * Sends a draft: gives it the next number of its month and keeps the names and payment details as they are now.
 * The number is worked out INSIDE this one statement (how many numbers the month has, plus one), and numbers are
 * never removed, so two sends at the same moment cannot get the same number or leave a hole.
 * Nothing happens unless the draft is still the version the teacher looked at and has an amount to pay.
 */
export const sendStatement = (
  db: D1Database,
  o: { tenantId: string; id: string; version: number; issued: unknown },
): D1PreparedStatement =>
  db
    .prepare(
      `UPDATE invoices SET status = 'sent',
         number = 'INV-' || REPLACE(period, '-', '') || '-' || printf('%04d',
           (SELECT COUNT(*) + 1 FROM invoices n WHERE n.tenant_id = invoices.tenant_id AND n.period = invoices.period AND n.number IS NOT NULL)),
         issued = ?1, sent_at = ?2, version = version + 1, updated_at = ?2
       WHERE tenant_id = ?3 AND id = ?4 AND version = ?5 AND status = 'draft' AND total > 0 AND json_array_length(lines) > 0`,
    )
    .bind(JSON.stringify(o.issued), nowIso(), o.tenantId, o.id, o.version);

export const paidStatement = (db: D1Database, tenantId: string, id: string, version: number) =>
  db
    .prepare(
      `UPDATE invoices SET status = 'paid', paid_at = ?1, version = version + 1, updated_at = ?1
       WHERE tenant_id = ?2 AND id = ?3 AND version = ?4 AND status = 'sent'`,
    )
    .bind(nowIso(), tenantId, id, version);

/** A receipt marked as paid by mistake goes back to "sent". */
export const unpaidStatement = (db: D1Database, tenantId: string, id: string, version: number) =>
  db
    .prepare(
      `UPDATE invoices SET status = 'sent', paid_at = NULL, version = version + 1, updated_at = ?1
       WHERE tenant_id = ?2 AND id = ?3 AND version = ?4 AND status = 'paid'`,
    )
    .bind(nowIso(), tenantId, id, version);

export const voidStatement = (
  db: D1Database,
  o: { tenantId: string; id: string; version: number; reason: string },
): D1PreparedStatement =>
  db
    .prepare(
      `UPDATE invoices SET status = 'void', voided_at = ?1, void_reason = ?2, version = version + 1, updated_at = ?1
       WHERE tenant_id = ?3 AND id = ?4 AND version = ?5 AND status IN ('sent', 'paid')`,
    )
    .bind(nowIso(), o.reason, o.tenantId, o.id, o.version);

// ------------------------------------------------------------- payment details

export interface PaymentRow {
  payee_name: string;
  payee_phone: string;
  bank_name: string;
  bank_bin: string;
  bank_account: string;
  bank_holder: string;
  payment_note: string;
}

export const paymentDetailsOf = (db: D1Database, tenantId: string) =>
  db
    .prepare(
      `SELECT payee_name, payee_phone, bank_name, bank_bin, bank_account, bank_holder, payment_note FROM tenants WHERE id = ?`,
    )
    .bind(tenantId)
    .first<PaymentRow>();

export const setPaymentDetailsStatement = (
  db: D1Database,
  tenantId: string,
  v: {
    payeeName: string;
    payeePhone: string;
    bankName: string;
    bankBin: string;
    bankAccount: string;
    bankHolder: string;
    paymentNote: string;
  },
) =>
  db
    .prepare(
      `UPDATE tenants SET payee_name = ?1, payee_phone = ?2, bank_name = ?3, bank_account = ?4, bank_holder = ?5, payment_note = ?6,
         bank_bin = ?8
       WHERE id = ?7`,
    )
    .bind(
      v.payeeName,
      v.payeePhone,
      v.bankName,
      v.bankAccount,
      v.bankHolder,
      v.paymentNote,
      tenantId,
      v.bankBin,
    );

// ------------------------------------------------------------- the student's side

/**
 * The receipts a student may see: only ones that were sent (never a draft), of a student profile linked to the
 * signed in person, in an active teacher account. The person is found from the session, never from the request.
 */
const MINE = `FROM invoices i
  JOIN students s ON s.id = i.student_id AND s.tenant_id = i.tenant_id AND s.user_id = ?1
  JOIN tenants t ON t.id = i.tenant_id AND t.status = 'active'
  WHERE i.status != 'draft'`;

export const myInvoices = async (db: D1Database, userId: string) =>
  (
    await db
      .prepare(
        `SELECT i.id, i.tenant_id, i.student_id, s.name AS student_name, i.period, i.number, i.status, i.total, i.sent_at,
           i.paid_at, i.issued, t.name AS teacher_name
         ${MINE} ORDER BY i.period DESC, i.sent_at DESC, i.id`,
      )
      .bind(userId)
      .all<{
        id: string;
        tenant_id: string;
        student_id: string;
        student_name: string;
        period: string;
        number: string | null;
        status: InvoiceStatus;
        total: number;
        sent_at: string | null;
        paid_at: string | null;
        issued: string | null;
        teacher_name: string;
      }>()
  ).results;

export const findMyInvoice = (db: D1Database, userId: string, id: string) =>
  db
    .prepare(
      `SELECT i.id, i.tenant_id, i.student_id, s.name AS student_name, i.period, i.number, i.status, i.lines, i.total, i.note,
         i.due_date, i.issued, i.sent_at, i.paid_at, i.voided_at, i.void_reason, i.version, t.name AS teacher_name
       ${MINE} AND i.id = ?2`,
    )
    .bind(userId, id)
    .first<{
      id: string;
      tenant_id: string;
      student_id: string;
      student_name: string;
      period: string;
      number: string | null;
      status: InvoiceStatus;
      lines: string;
      total: number;
      note: string;
      due_date: string | null;
      issued: string | null;
      sent_at: string | null;
      paid_at: string | null;
      voided_at: string | null;
      void_reason: string;
      version: number;
      teacher_name: string;
    }>();

/** How many students have attended paid lessons in the range that are on no receipt yet. */
export const studentsWithUnbilled = async (
  db: D1Database,
  tenantId: string,
  fromUtc: string,
  toUtc: string,
) =>
  (
    await db
      .prepare(
        `SELECT COUNT(DISTINCT a.student_id) AS n
         FROM attendance a JOIN lessons l ON l.id = a.lesson_id AND l.tenant_id = a.tenant_id
           JOIN courses c ON c.id = l.course_id AND c.tenant_id = l.tenant_id
           LEFT JOIN enrollments e ON e.tenant_id = l.tenant_id AND e.course_id = l.course_id AND e.student_id = a.student_id
         WHERE a.tenant_id = ?1 AND a.status = 'attended' AND l.status != 'cancelled' AND l.starts_at >= ?2 AND l.starts_at < ?3
           AND COALESCE(e.custom_price, c.price_per_lesson) > 0 AND NOT ${BILLED_ANY}`,
      )
      .bind(tenantId, fromUtc, toUtc)
      .first<{ n: number }>()
  )?.n ?? 0;

export const studentInTenant = async (db: D1Database, tenantId: string, studentId: string) =>
  (await db
    .prepare("SELECT 1 AS x FROM students WHERE tenant_id = ? AND id = ?")
    .bind(tenantId, studentId)
    .first()) !== null;

/** How many receipts are drafts, and how many are sent but not paid (with the money). Cancelled ones do not count. */
export const invoiceCounts = (db: D1Database, tenantId: string) =>
  db
    .prepare(
      `SELECT COALESCE(SUM(status = 'draft'), 0) AS drafts, COALESCE(SUM(status = 'sent'), 0) AS unpaid,
         COALESCE(SUM(CASE WHEN status = 'sent' THEN total END), 0) AS unpaid_amount
       FROM invoices WHERE tenant_id = ?`,
    )
    .bind(tenantId)
    .first<{ drafts: number; unpaid: number; unpaid_amount: number }>();
