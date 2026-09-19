-- 0015: notifications (M5). One row for each person and event. The person sees it in the app (bell / list); if
-- they did not turn it off, it is also put in an email. Emails are sent by a job that runs every few minutes and
-- puts everything waiting for one person into ONE email. Expand only.

-- The kinds of email a person turned off, as JSON: ["homework_due"].
ALTER TABLE users ADD COLUMN email_muted TEXT NOT NULL DEFAULT '[]';

CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants (id),
  user_id TEXT NOT NULL REFERENCES users (id),
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  -- A path inside the app, for example /my/work/abc.
  link TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  read_at TEXT,
  -- The same event never makes two notifications for one person: (user_id, dedupe_key) is unique.
  dedupe_key TEXT,
  email_state TEXT NOT NULL DEFAULT 'none' CHECK (email_state IN ('none', 'pending', 'sent', 'failed')),
  email_tries INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_notifications_user ON notifications (user_id, created_at);
CREATE UNIQUE INDEX idx_notifications_dedupe ON notifications (user_id, dedupe_key) WHERE dedupe_key IS NOT NULL;
CREATE INDEX idx_notifications_pending ON notifications (created_at) WHERE email_state = 'pending';

CREATE TRIGGER notifications_same_tenant BEFORE INSERT ON notifications
WHEN NOT EXISTS (SELECT 1 FROM memberships m WHERE m.user_id = NEW.user_id AND m.tenant_id = NEW.tenant_id)
BEGIN
  SELECT RAISE(ABORT, 'notification must stay inside one tenant');
END;
