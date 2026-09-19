-- 0006: notes a teacher writes about a student ("comments", PVD 4.5). Expand only.
-- The history is kept: a note can never be edited or deleted. The one thing that can change is who
-- may see it, so a note saved as "student can see" by mistake can be made private again.

CREATE TABLE student_notes (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants (id),
  student_id TEXT NOT NULL REFERENCES students (id),
  author_user_id TEXT NOT NULL REFERENCES users (id),
  visibility TEXT NOT NULL CHECK (visibility IN ('student_visible', 'private')),
  body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 2000),
  created_at TEXT NOT NULL
);
CREATE INDEX idx_notes_student ON student_notes (tenant_id, student_id, created_at);

CREATE TRIGGER notes_same_tenant_insert BEFORE INSERT ON student_notes
WHEN (SELECT tenant_id FROM students WHERE id = NEW.student_id) IS NOT NEW.tenant_id
BEGIN
  SELECT RAISE(ABORT, 'note must stay inside one tenant');
END;

CREATE TRIGGER notes_no_delete BEFORE DELETE ON student_notes
BEGIN
  SELECT RAISE(ABORT, 'notes are kept');
END;

CREATE TRIGGER notes_only_visibility_changes BEFORE UPDATE OF id, tenant_id, student_id, author_user_id, body, created_at ON student_notes
BEGIN
  SELECT RAISE(ABORT, 'a note cannot be edited');
END;
