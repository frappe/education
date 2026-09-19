-- 0002: courses, and more student profile fields. Expand only: nothing is removed.

CREATE TABLE courses (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants (id),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  -- Whole VND. No decimals, so there is no rounding error.
  price_per_lesson INTEGER NOT NULL DEFAULT 0 CHECK (price_per_lesson >= 0),
  start_date TEXT,
  end_date TEXT,
  max_students INTEGER CHECK (max_students IS NULL OR max_students >= 1),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  -- Goes up by one at every change. A save based on an old version is refused.
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_courses_tenant_status ON courses (tenant_id, status);

-- students.status keeps its meaning from 0001: 'invited' = has not joined yet (an invite may or may
-- not have been sent), 'active' = joined, 'archived' = hidden from lists. Whether an invite was sent
-- is read from auth_tokens, so no change to the existing constraint is needed.
ALTER TABLE students ADD COLUMN phone TEXT NOT NULL DEFAULT '';
ALTER TABLE students ADD COLUMN teacher_note TEXT NOT NULL DEFAULT '';
ALTER TABLE students ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
CREATE INDEX idx_students_tenant_status ON students (tenant_id, status);
