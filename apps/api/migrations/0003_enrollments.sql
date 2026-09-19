-- 0003: which students joined which course. Expand only.

CREATE TABLE enrollments (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants (id),
  course_id TEXT NOT NULL REFERENCES courses (id),
  student_id TEXT NOT NULL REFERENCES students (id),
  -- pending is for self sign up (later). A teacher who adds a student makes it active at once.
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active', 'completed', 'dropped')),
  -- A price for this student only (a discount). NULL means the course price is used.
  custom_price INTEGER CHECK (custom_price IS NULL OR custom_price >= 0),
  enrolled_at TEXT NOT NULL,
  ended_at TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  -- One row per student and course. Joining again after leaving re-opens the same row.
  UNIQUE (course_id, student_id)
);
CREATE INDEX idx_enrollments_course ON enrollments (tenant_id, course_id, status);
CREATE INDEX idx_enrollments_student ON enrollments (tenant_id, student_id);

-- The database itself refuses a row that mixes tenants, even if some code forgot to check.
CREATE TRIGGER enrollments_same_tenant_insert BEFORE INSERT ON enrollments
WHEN (SELECT tenant_id FROM courses WHERE id = NEW.course_id) IS NOT NEW.tenant_id
  OR (SELECT tenant_id FROM students WHERE id = NEW.student_id) IS NOT NEW.tenant_id
BEGIN
  SELECT RAISE(ABORT, 'enrollment must stay inside one tenant');
END;

CREATE TRIGGER enrollments_same_tenant_update BEFORE UPDATE OF tenant_id, course_id, student_id ON enrollments
WHEN (SELECT tenant_id FROM courses WHERE id = NEW.course_id) IS NOT NEW.tenant_id
  OR (SELECT tenant_id FROM students WHERE id = NEW.student_id) IS NOT NEW.tenant_id
BEGIN
  SELECT RAISE(ABORT, 'enrollment must stay inside one tenant');
END;
