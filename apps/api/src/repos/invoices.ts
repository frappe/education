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
  bank_account: string;
  bank_holder: string;
  payment_note: string;
}

const COLUMNS = `i.id, i.tenant_id, i.student_id, s.name AS student_name, s.email AS student_email, i.period, i.number,
  i.status, i.lines, i.total, i.note, i.due_date, i.issued, i.sent_at, i.paid_at, i.voided_at, i.void_reason, i.version,
  t.name AS teacher_name, t.payee_name, t.payee_phone, t.bank_name, t.bank_account, t.bank_holder, t.payment_note`;
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
  course_id: string;
  course_name: string;
  price: number;
  starts_at: string;
}

/**
 * The lessons to charge in a time range: one row for each lesson a student attended. (Only "attended" is
 * charged, never "absent", and never a cancelled lesson.) The price is the student's own price for the course
 * if the teacher set one, else the course price. A free lesson (price 0) is left out. Pass a student id for one
 * student, or null for everyone.
 */
export async function billableLessons(
  db: D1Database,
  tenantId: string,
  fromUtc: string,
  toUtc: string,
  studentId: string | null,
) {
  const res = await db
    .prepare(
      `SELECT a.student_id, l.course_id, c.name AS course_name,
         COALESCE(e.custom_price, c.price_per_lesson) AS price, l.starts_at
       FROM attendance a
       JOIN lessons l ON l.id = a.lesson_id AND l.tenant_id = a.tenant_id
       JOIN courses c ON c.id = l.course_id AND c.tenant_id = l.tenant_id
       LEFT JOIN enrollments e ON e.tenant_id = l.tenant_id AND e.course_id = l.course_id AND e.student_id = a.student_id
       WHERE a.tenant_id = ?1 AND a.status = 'attended' AND l.status != 'cancelled'
         AND l.starts_at >= ?2 AND l.starts_at < ?3 AND (?4 IS NULL OR a.student_id = ?4)
         AND COALESCE(e.custom_price, c.price_per_lesson) > 0
       ORDER BY a.student_id, c.name COLLATE NOCASE, l.starts_at`,
    )
    .bind(tenantId, fromUtc, toUtc, studentId)
    .all<BillableRow>();
  return res.results;
}

/**
 * Makes draft receipts in ONE statement. A student who already has a receipt for that month (not cancelled)
 * is skipped by the database itself, so two teachers' clicks at the same moment never make two.
 * A student who is not in this tenant is skipped too. `meta.changes` is the number of new drafts.
 */
export const insertDraftsStatement = (
  db: D1Database,
  o: {
    tenantId: string;
    userId: string;
    period: string;
    drafts: { id: string; studentId: string; lines: unknown[]; total: number }[];
  },
): D1PreparedStatement =>
  db
    .prepare(
      `INSERT INTO invoices (id, tenant_id, student_id, period, lines, total, status, version, created_by, created_at, updated_at)
       SELECT json_extract(j.value, '$.id'), s.tenant_id, s.id, ?2, json_extract(j.value, '$.lines'),
         json_extract(j.value, '$.total'), 'draft', 1, ?3, ?4, ?4
       FROM json_each(?1) j JOIN students s ON s.tenant_id = ?5 AND s.id = json_extract(j.value, '$.studentId')
       WHERE 1
       ON CONFLICT DO NOTHING`,
    )
    .bind(JSON.stringify(o.drafts), o.period, o.userId, nowIso(), o.tenantId);

/** Saves the lines, note and due date of a draft, only if it is still the version the teacher looked at. */
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
       WHERE tenant_id = ?6 AND id = ?7 AND version = ?8 AND status = 'draft'`,
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
  bank_account: string;
  bank_holder: string;
  payment_note: string;
}

export const paymentDetailsOf = (db: D1Database, tenantId: string) =>
  db
    .prepare(
      `SELECT payee_name, payee_phone, bank_name, bank_account, bank_holder, payment_note FROM tenants WHERE id = ?`,
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
    bankAccount: string;
    bankHolder: string;
    paymentNote: string;
  },
) =>
  db
    .prepare(
      `UPDATE tenants SET payee_name = ?1, payee_phone = ?2, bank_name = ?3, bank_account = ?4, bank_holder = ?5, payment_note = ?6
       WHERE id = ?7`,
    )
    .bind(v.payeeName, v.payeePhone, v.bankName, v.bankAccount, v.bankHolder, v.paymentNote, tenantId);

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
           i.paid_at, t.name AS teacher_name
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

/** How many students attended a paid lesson in the range but have no receipt for the month. */
export const studentsWithoutInvoice = async (
  db: D1Database,
  tenantId: string,
  period: string,
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
           AND COALESCE(e.custom_price, c.price_per_lesson) > 0
           AND NOT EXISTS (SELECT 1 FROM invoices i WHERE i.tenant_id = a.tenant_id AND i.student_id = a.student_id
             AND i.period = ?4 AND i.status != 'void')`,
      )
      .bind(tenantId, fromUtc, toUtc, period)
      .first<{ n: number }>()
  )?.n ?? 0;

export const studentInTenant = async (db: D1Database, tenantId: string, studentId: string) =>
  (await db
    .prepare("SELECT 1 AS x FROM students WHERE tenant_id = ? AND id = ?")
    .bind(tenantId, studentId)
    .first()) !== null;
