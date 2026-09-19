-- 0013: a receipt is made from lessons the teacher picks (M4 change).
-- Before, a student had one receipt for each month. Now a lesson can be on one receipt only (kept by the
-- statements that make and change receipts, which look at the lessons inside every receipt that is not
-- cancelled), so a student can have more than one receipt in a month.
-- Each line keeps the lessons behind it: JSON { ..., lessons: [{ id, at }] } (older lines have "at" only).

DROP INDEX idx_invoices_one_per_month;
