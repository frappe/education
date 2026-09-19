-- 0011: the teacher can write a comment or a correction on each question of an answer (M3).
-- It is a JSON map from question id to text. The student sees it only after the work is returned.
-- Expand only: nothing is removed.

ALTER TABLE submissions ADD COLUMN question_notes TEXT NOT NULL DEFAULT '{}';
