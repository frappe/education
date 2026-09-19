-- 0014: the comments the teacher writes on each question are part of the score history too.
-- A line is kept whenever the score, the feedback or a comment changes. Expand only.

ALTER TABLE grade_revisions ADD COLUMN old_notes TEXT NOT NULL DEFAULT '{}';
ALTER TABLE grade_revisions ADD COLUMN new_notes TEXT NOT NULL DEFAULT '{}';

DROP TRIGGER submissions_keep_score_history;
CREATE TRIGGER submissions_keep_score_history AFTER UPDATE OF score, feedback, question_notes ON submissions
WHEN NEW.last_grader_id IS NOT NULL
  AND (OLD.score IS NOT NEW.score OR OLD.feedback IS NOT NEW.feedback OR OLD.question_notes IS NOT NEW.question_notes)
BEGIN
  INSERT INTO grade_revisions (id, tenant_id, submission_id, at, actor_user_id, old_score, new_score, old_feedback, new_feedback, old_notes, new_notes)
  VALUES (lower(hex(randomblob(16))), NEW.tenant_id, NEW.id, NEW.updated_at, NEW.last_grader_id,
          OLD.score, NEW.score, OLD.feedback, NEW.feedback, OLD.question_notes, NEW.question_notes);
END;
