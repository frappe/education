-- 0010: a homework is now a list of questions of mixed kinds, each with its own points (M3 redesign).
-- The questions (with their kind, points and answer key) live in assignments.questions as JSON.
-- What a student answered, and the points of each question, are new columns on submissions.
-- assignments.type stays only as a summary (a quiz, speaking, or mixed/written); nothing depends on it.
-- assignments.max_score is the sum of the points of the questions. The old submissions columns
-- text_answer, link_url and answers are no longer used. Expand only: nothing is removed.

ALTER TABLE submissions ADD COLUMN responses TEXT NOT NULL DEFAULT '[]';
ALTER TABLE submissions ADD COLUMN question_points TEXT NOT NULL DEFAULT '{}';

-- Scores now come from the points of the questions, so a maximum of up to 1000 makes sense.
-- (max_score already allows up to 1000.)
