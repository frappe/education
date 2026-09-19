-- 0016: notifications are shown in the app only, so nothing about email is kept for them.

DROP INDEX idx_notifications_pending;
ALTER TABLE notifications DROP COLUMN email_state;
ALTER TABLE notifications DROP COLUMN email_tries;
ALTER TABLE users DROP COLUMN email_muted;
