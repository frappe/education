-- 0012: fee receipts ("invoices", M4) and the teacher's payment details. Expand only.
-- Money is a whole number of VND. A receipt has a status: draft -> sent -> paid, or cancelled (void) after it was sent.

-- How students can pay the teacher. Copied onto a receipt when it is sent, so an old receipt never changes.
ALTER TABLE tenants ADD COLUMN payee_name TEXT NOT NULL DEFAULT '';
ALTER TABLE tenants ADD COLUMN payee_phone TEXT NOT NULL DEFAULT '';
ALTER TABLE tenants ADD COLUMN bank_name TEXT NOT NULL DEFAULT '';
ALTER TABLE tenants ADD COLUMN bank_account TEXT NOT NULL DEFAULT '';
ALTER TABLE tenants ADD COLUMN bank_holder TEXT NOT NULL DEFAULT '';
ALTER TABLE tenants ADD COLUMN payment_note TEXT NOT NULL DEFAULT '';

CREATE TABLE invoices (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants (id),
  student_id TEXT NOT NULL REFERENCES students (id),
  -- The month the receipt is for, "YYYY-MM" in the teacher's time zone.
  period TEXT NOT NULL CHECK (period GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]'),
  -- Given when the receipt is sent: INV-YYYYMM-0001, counting up inside each month. Drafts have none.
  number TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'void')),
  -- JSON: [{ id, courseId|null, description, quantity, unitPrice, amount, at: [UTC start of each lesson] }]
  lines TEXT NOT NULL DEFAULT '[]',
  total INTEGER NOT NULL DEFAULT 0 CHECK (total >= 0),
  note TEXT NOT NULL DEFAULT '',
  due_date TEXT,
  -- JSON, set when sent: { teacherName, studentName, payee: {...} }.
  issued TEXT,
  sent_at TEXT,
  paid_at TEXT,
  voided_at TEXT,
  void_reason TEXT NOT NULL DEFAULT '',
  version INTEGER NOT NULL DEFAULT 1,
  created_by TEXT REFERENCES users (id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (status = 'draft' OR (number IS NOT NULL AND issued IS NOT NULL AND sent_at IS NOT NULL))
);
CREATE UNIQUE INDEX idx_invoices_number ON invoices (tenant_id, number) WHERE number IS NOT NULL;
-- One receipt for each student and month. A cancelled one frees the place for a new one.
CREATE UNIQUE INDEX idx_invoices_one_per_month ON invoices (tenant_id, student_id, period) WHERE status != 'void';
CREATE INDEX idx_invoices_tenant_period ON invoices (tenant_id, period);
CREATE INDEX idx_invoices_student ON invoices (tenant_id, student_id);

-- The database itself keeps these rules, even if some code forgot to check.
CREATE TRIGGER invoices_same_tenant_insert BEFORE INSERT ON invoices
WHEN (SELECT tenant_id FROM students WHERE id = NEW.student_id) IS NOT NEW.tenant_id
BEGIN
  SELECT RAISE(ABORT, 'invoice must stay inside one tenant');
END;

CREATE TRIGGER invoices_sent_stay_as_sent BEFORE UPDATE OF tenant_id, student_id, period, lines, total, note, due_date ON invoices
WHEN OLD.status != 'draft'
BEGIN
  SELECT RAISE(ABORT, 'a receipt that was sent cannot be changed');
END;

CREATE TRIGGER invoices_number_stays BEFORE UPDATE OF number, issued, sent_at ON invoices
WHEN OLD.number IS NOT NULL
BEGIN
  SELECT RAISE(ABORT, 'the number of a receipt cannot be changed');
END;

CREATE TRIGGER invoices_only_drafts_are_deleted BEFORE DELETE ON invoices
WHEN OLD.status != 'draft'
BEGIN
  SELECT RAISE(ABORT, 'only a draft receipt can be deleted');
END;
