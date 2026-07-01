-- Versioned legal consent per user (RGPD): records WHEN and WHICH version of the
-- Terms of Service and Privacy Policy each account accepted, plus the request
-- IP and user-agent for auditability. Required for every registration
-- (local + social onboarding). See identity context / issue.
CREATE TABLE IF NOT EXISTS user_consents (
  id          uuid PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document    text NOT NULL,          -- 'terms' | 'privacy'
  version     text NOT NULL,          -- published document version, e.g. '2026-07-01'
  ip          text,                   -- request IP at acceptance (nullable)
  user_agent  text,                   -- request User-Agent at acceptance (nullable)
  accepted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_consents_user_idx ON user_consents(user_id);
