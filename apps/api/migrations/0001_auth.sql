-- 0001_auth: tenants, users, sign in sessions, one-time tokens, rate limits, audit log.
-- Times are ISO 8601 text in UTC, except rate_limits which uses whole seconds.

CREATE TABLE tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
  currency TEXT NOT NULL DEFAULT 'VND',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_at TEXT NOT NULL
);

-- One row per person, across all tenants. Email is stored lower case.
-- password_hash is NULL for people who only sign in with a magic link.
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT,
  email_verified_at TEXT,
  disabled_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Which tenants a person belongs to, and as what.
CREATE TABLE memberships (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users (id),
  tenant_id TEXT NOT NULL REFERENCES tenants (id),
  role TEXT NOT NULL CHECK (role IN ('teacher', 'student')),
  created_at TEXT NOT NULL,
  UNIQUE (user_id, tenant_id)
);
CREATE INDEX idx_memberships_tenant ON memberships (tenant_id);

-- A student profile is owned by the teacher's tenant. user_id stays NULL until the
-- student accepts the invite. More columns are added in M2 (expand only).
CREATE TABLE students (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants (id),
  user_id TEXT REFERENCES users (id),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'active', 'archived')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (tenant_id, email)
);
CREATE INDEX idx_students_user ON students (user_id);

-- Only the SHA-256 of the session token is stored, never the token itself.
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL REFERENCES users (id),
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  idle_days INTEGER NOT NULL,
  revoked_at TEXT,
  user_agent TEXT,
  ip_hash TEXT
);
CREATE INDEX idx_sessions_user ON sessions (user_id);

-- One-time links: confirm email, reset password, magic link, student invite.
-- Only the hash of the token is stored. used_at is set once, so a link works once.
CREATE TABLE auth_tokens (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('verify_email', 'password_reset', 'magic_link', 'invite')),
  token_hash TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  user_id TEXT REFERENCES users (id),
  tenant_id TEXT REFERENCES tenants (id),
  student_id TEXT REFERENCES students (id),
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  revoked_at TEXT
);
CREATE INDEX idx_auth_tokens_student ON auth_tokens (student_id, kind);
CREATE INDEX idx_auth_tokens_tenant_created ON auth_tokens (tenant_id, kind, created_at);

-- Counters for limits such as "5 wrong passwords in 15 minutes". Keys never hold a raw
-- email or IP address, only a keyed hash.
CREATE TABLE rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  window_start INTEGER NOT NULL
);

-- Record of important actions. Rows can only be added: the triggers below refuse any
-- change or delete. (A later migration will add a controlled clean up after the retention period.)
CREATE TABLE audit_log (
  id TEXT PRIMARY KEY,
  at TEXT NOT NULL,
  tenant_id TEXT,
  actor_user_id TEXT,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  ip_hash TEXT,
  meta TEXT
);
CREATE INDEX idx_audit_tenant_at ON audit_log (tenant_id, at);
CREATE INDEX idx_audit_actor_at ON audit_log (actor_user_id, at);

CREATE TRIGGER audit_log_no_update BEFORE UPDATE ON audit_log
BEGIN
  SELECT RAISE(ABORT, 'audit_log is append only');
END;

CREATE TRIGGER audit_log_no_delete BEFORE DELETE ON audit_log
BEGIN
  SELECT RAISE(ABORT, 'audit_log is append only');
END;
