-- 0007: the "notes with a visibility" feature was dropped. A teacher's note on a student stays a single
-- private field on the profile, and comments for students belong to grading (feedback) and invoices.
-- Nothing reads this table any more, so it is removed (its triggers go with it).
DROP TABLE IF EXISTS student_notes;
