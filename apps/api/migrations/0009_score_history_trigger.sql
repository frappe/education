-- 0009: the score history is written by the database itself. Whenever a score or feedback changes, one line
-- with the old and new values is kept, in the same moment and only if the change really happened. So a
-- change without history, or history without a change (two teachers saving at once), cannot happen.

ALTER TABLE submissions ADD COLUMN last_grader_id TEXT REFERENCES users (id);

CREATE TRIGGER submissions_keep_score_history AFTER UPDATE OF score, feedback ON submissions
WHEN NEW.last_grader_id IS NOT NULL AND (OLD.score IS NOT NEW.score OR OLD.feedback IS NOT NEW.feedback)
BEGIN
  INSERT INTO grade_revisions (id, tenant_id, submission_id, at, actor_user_id, old_score, new_score, old_feedback, new_feedback)
  VALUES (lower(hex(randomblob(16))), NEW.tenant_id, NEW.id, NEW.updated_at, NEW.last_grader_id,
          OLD.score, NEW.score, OLD.feedback, NEW.feedback);
END;
