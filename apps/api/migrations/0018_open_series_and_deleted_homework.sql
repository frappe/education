-- 0018: lessons that repeat with no end date, and homework that the teacher deleted. Expand only.

-- A series that has no end date. The app keeps making the next lessons ahead of time (see lessons/jobs.ts).
-- Lessons of the series point to it with lessons.series_id. A series that has an end date needs no row here.
CREATE TABLE lesson_series (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants (id),
  course_id TEXT NOT NULL REFERENCES courses (id),
  -- 1: every week. 2: every two weeks.
  every_weeks INTEGER NOT NULL CHECK (every_weeks IN (1, 2)),
  -- 1 when the teacher cancelled "this and the next lessons": nothing new is made.
  ended INTEGER NOT NULL DEFAULT 0 CHECK (ended IN (0, 1)),
  created_at TEXT NOT NULL
);
CREATE INDEX idx_lesson_series_open ON lesson_series (ended, tenant_id);

CREATE TRIGGER lesson_series_same_tenant BEFORE INSERT ON lesson_series
WHEN (SELECT tenant_id FROM courses WHERE id = NEW.course_id) IS NOT NEW.tenant_id
BEGIN SELECT RAISE(ABORT, 'series must stay inside one tenant'); END;

-- Deleted homework is hidden everywhere. What students handed in and the score history stay in the database
-- (the score history can never be erased), but nobody sees them.
ALTER TABLE assignments ADD COLUMN deleted_at TEXT;
