-- 0004_identities: "Sign in with Google". One row links a person to their Google account.
-- Google's own id (`subject`) is what we trust, never the email alone: an email can change hands,
-- the subject cannot. A person can have at most one Google account linked, and a Google account
-- can be linked to at most one person.

CREATE TABLE identities (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users (id),
  provider TEXT NOT NULL CHECK (provider IN ('google')),
  subject TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (provider, subject),
  UNIQUE (user_id, provider)
);
