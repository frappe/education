-- 0019: an index for the hourly job that finds work which is due soon. Expand only.
CREATE INDEX idx_assignments_due ON assignments (status, due_at);
