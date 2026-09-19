-- 0005: lessons and attendance. Expand only.

CREATE TABLE lessons (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants (id),
  course_id TEXT NOT NULL REFERENCES courses (id),
  -- Lessons made together by "repeat every week" share one series id. NULL for a single lesson.
  series_id TEXT,
  title TEXT NOT NULL DEFAULT '',
  -- UTC, ISO 8601. The teacher's time zone is only used to show and to enter times.
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL CHECK (ends_at > starts_at),
  place TEXT NOT NULL DEFAULT '',
  online_url TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'held', 'cancelled')),
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_lessons_tenant_time ON lessons (tenant_id, starts_at);
CREATE INDEX idx_lessons_course_time ON lessons (course_id, starts_at);
CREATE INDEX idx_lessons_series ON lessons (series_id, starts_at);

-- One row per student and lesson. Only "attended" lessons are billed (plan, Section 3.3).
CREATE TABLE attendance (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants (id),
  lesson_id TEXT NOT NULL REFERENCES lessons (id),
  student_id TEXT NOT NULL REFERENCES students (id),
  status TEXT NOT NULL CHECK (status IN ('attended', 'absent')),
  marked_at TEXT NOT NULL,
  marked_by TEXT REFERENCES users (id),
  UNIQUE (lesson_id, student_id)
);
CREATE INDEX idx_attendance_student ON attendance (tenant_id, student_id);

-- The database itself refuses a row that mixes tenants, even if some code forgot to check.
CREATE TRIGGER lessons_same_tenant_insert BEFORE INSERT ON lessons
WHEN (SELECT tenant_id FROM courses WHERE id = NEW.course_id) IS NOT NEW.tenant_id
BEGIN
  SELECT RAISE(ABORT, 'lesson must stay inside one tenant');
END;

CREATE TRIGGER lessons_same_tenant_update BEFORE UPDATE OF tenant_id, course_id ON lessons
WHEN (SELECT tenant_id FROM courses WHERE id = NEW.course_id) IS NOT NEW.tenant_id
BEGIN
  SELECT RAISE(ABORT, 'lesson must stay inside one tenant');
END;

CREATE TRIGGER attendance_same_tenant_insert BEFORE INSERT ON attendance
WHEN (SELECT tenant_id FROM lessons WHERE id = NEW.lesson_id) IS NOT NEW.tenant_id
  OR (SELECT tenant_id FROM students WHERE id = NEW.student_id) IS NOT NEW.tenant_id
BEGIN
  SELECT RAISE(ABORT, 'attendance must stay inside one tenant');
END;

CREATE TRIGGER attendance_same_tenant_update BEFORE UPDATE OF tenant_id, lesson_id, student_id ON attendance
WHEN (SELECT tenant_id FROM lessons WHERE id = NEW.lesson_id) IS NOT NEW.tenant_id
  OR (SELECT tenant_id FROM students WHERE id = NEW.student_id) IS NOT NEW.tenant_id
BEGIN
  SELECT RAISE(ABORT, 'attendance must stay inside one tenant');
END;
