-- 0008: course links, assignments, submissions and grading (M3). Expand only.
-- There are no file uploads: materials and answers are text and https links.

CREATE TABLE course_materials (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants (id),
  course_id TEXT NOT NULL REFERENCES courses (id),
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  -- 0 = only the teacher sees it. 1 = students of the course see it.
  published INTEGER NOT NULL DEFAULT 1 CHECK (published IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_materials_course ON course_materials (tenant_id, course_id, created_at);

CREATE TABLE assignments (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants (id),
  course_id TEXT NOT NULL REFERENCES courses (id),
  type TEXT NOT NULL CHECK (type IN ('multiple_choice', 'essay', 'speaking')),
  title TEXT NOT NULL,
  instructions TEXT NOT NULL DEFAULT '',
  -- JSON list of {text, options[]} for multiple choice. The teacher scores by hand, so no answer key.
  questions TEXT NOT NULL DEFAULT '[]',
  -- JSON list of {title, url}: links the student needs for this work.
  links TEXT NOT NULL DEFAULT '[]',
  -- UTC. NULL means no due date.
  due_at TEXT,
  allow_late INTEGER NOT NULL DEFAULT 0 CHECK (allow_late IN (0, 1)),
  max_score INTEGER NOT NULL DEFAULT 10 CHECK (max_score BETWEEN 1 AND 1000),
  target_mode TEXT NOT NULL DEFAULT 'all' CHECK (target_mode IN ('all', 'selected')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'closed')),
  published_at TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_assignments_course ON assignments (tenant_id, course_id, created_at);

-- Only for target_mode = 'selected'.
CREATE TABLE assignment_targets (
  assignment_id TEXT NOT NULL REFERENCES assignments (id),
  student_id TEXT NOT NULL REFERENCES students (id),
  tenant_id TEXT NOT NULL REFERENCES tenants (id),
  PRIMARY KEY (assignment_id, student_id)
);
CREATE INDEX idx_targets_student ON assignment_targets (tenant_id, student_id);

-- One row per student and assignment. A student who has not started has no row yet.
CREATE TABLE submissions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants (id),
  assignment_id TEXT NOT NULL REFERENCES assignments (id),
  student_id TEXT NOT NULL REFERENCES students (id),
  status TEXT NOT NULL DEFAULT 'drafted'
    CHECK (status IN ('drafted', 'submitted', 'graded', 'returned', 'revision_requested')),
  text_answer TEXT NOT NULL DEFAULT '',
  link_url TEXT,
  -- JSON list of chosen option numbers (multiple choice), one per question, -1 = not answered.
  answers TEXT NOT NULL DEFAULT '[]',
  submitted_at TEXT,
  is_late INTEGER NOT NULL DEFAULT 0 CHECK (is_late IN (0, 1)),
  revision_count INTEGER NOT NULL DEFAULT 0,
  -- Steps of 0.5, checked by the API.
  score REAL,
  feedback TEXT NOT NULL DEFAULT '',
  graded_at TEXT,
  returned_at TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (assignment_id, student_id)
);
CREATE INDEX idx_submissions_student ON submissions (tenant_id, student_id, status);
CREATE INDEX idx_submissions_queue ON submissions (tenant_id, status, submitted_at);

-- More time for one student.
CREATE TABLE submission_extensions (
  assignment_id TEXT NOT NULL REFERENCES assignments (id),
  student_id TEXT NOT NULL REFERENCES students (id),
  tenant_id TEXT NOT NULL REFERENCES tenants (id),
  until_at TEXT NOT NULL,
  PRIMARY KEY (assignment_id, student_id)
);

-- Every change of a score or feedback is kept, for ever.
CREATE TABLE grade_revisions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants (id),
  submission_id TEXT NOT NULL REFERENCES submissions (id),
  at TEXT NOT NULL,
  actor_user_id TEXT NOT NULL REFERENCES users (id),
  old_score REAL,
  new_score REAL,
  old_feedback TEXT NOT NULL DEFAULT '',
  new_feedback TEXT NOT NULL DEFAULT ''
);
CREATE INDEX idx_grade_revisions_submission ON grade_revisions (tenant_id, submission_id, at);

CREATE TRIGGER grade_revisions_no_update BEFORE UPDATE ON grade_revisions
BEGIN
  SELECT RAISE(ABORT, 'grade_revisions is append only');
END;
CREATE TRIGGER grade_revisions_no_delete BEFORE DELETE ON grade_revisions
BEGIN
  SELECT RAISE(ABORT, 'grade_revisions is append only');
END;

-- The database itself refuses rows that mix tenants, even if some code forgot to check.
CREATE TRIGGER materials_same_tenant BEFORE INSERT ON course_materials
WHEN (SELECT tenant_id FROM courses WHERE id = NEW.course_id) IS NOT NEW.tenant_id
BEGIN SELECT RAISE(ABORT, 'material must stay inside one tenant'); END;

CREATE TRIGGER assignments_same_tenant BEFORE INSERT ON assignments
WHEN (SELECT tenant_id FROM courses WHERE id = NEW.course_id) IS NOT NEW.tenant_id
BEGIN SELECT RAISE(ABORT, 'assignment must stay inside one tenant'); END;

CREATE TRIGGER targets_same_tenant BEFORE INSERT ON assignment_targets
WHEN (SELECT tenant_id FROM assignments WHERE id = NEW.assignment_id) IS NOT NEW.tenant_id
  OR (SELECT tenant_id FROM students WHERE id = NEW.student_id) IS NOT NEW.tenant_id
BEGIN SELECT RAISE(ABORT, 'target must stay inside one tenant'); END;

CREATE TRIGGER submissions_same_tenant BEFORE INSERT ON submissions
WHEN (SELECT tenant_id FROM assignments WHERE id = NEW.assignment_id) IS NOT NEW.tenant_id
  OR (SELECT tenant_id FROM students WHERE id = NEW.student_id) IS NOT NEW.tenant_id
BEGIN SELECT RAISE(ABORT, 'submission must stay inside one tenant'); END;

CREATE TRIGGER extensions_same_tenant BEFORE INSERT ON submission_extensions
WHEN (SELECT tenant_id FROM assignments WHERE id = NEW.assignment_id) IS NOT NEW.tenant_id
  OR (SELECT tenant_id FROM students WHERE id = NEW.student_id) IS NOT NEW.tenant_id
BEGIN SELECT RAISE(ABORT, 'extension must stay inside one tenant'); END;

CREATE TRIGGER revisions_same_tenant BEFORE INSERT ON grade_revisions
WHEN (SELECT tenant_id FROM submissions WHERE id = NEW.submission_id) IS NOT NEW.tenant_id
BEGIN SELECT RAISE(ABORT, 'revision must stay inside one tenant'); END;
