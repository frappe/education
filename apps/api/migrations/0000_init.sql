-- 0000_init: foundation tables.
-- Migrations must be backward compatible (expand, then contract) so a rollback of the
-- Worker never meets a schema it cannot read.

CREATE TABLE app_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT INTO app_meta (key, value) VALUES ('schema_created', 'm0');

-- Email outbox. In "dev" email mode the message body is stored here so it can be read
-- in the admin screen (magic links included). In real sending mode the body columns
-- stay NULL, so secret links are never kept in the database.
CREATE TABLE email_outbox (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_text TEXT,
  status TEXT NOT NULL CHECK (status IN ('queued', 'logged', 'sent', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TEXT NOT NULL,
  sent_at TEXT
);

CREATE INDEX idx_email_outbox_status ON email_outbox (status, created_at);
