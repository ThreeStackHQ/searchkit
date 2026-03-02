-- SearchKit initial schema migration
-- Run with: psql $DATABASE_URL -f packages/db/migrations/0000_initial.sql

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums
DO $$ BEGIN
  CREATE TYPE plan AS ENUM ('free', 'indie', 'pro');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Workspaces
CREATE TABLE IF NOT EXISTS workspaces (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  plan        plan NOT NULL DEFAULT 'free',
  stripe_customer_id TEXT,
  api_key     TEXT UNIQUE, -- legacy field, not used (see api_keys table)
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- API Keys (workspace-scoped, hashed)
CREATE TABLE IF NOT EXISTS api_keys (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  key_prefix    VARCHAR(8),
  key_hash      TEXT NOT NULL,
  last_used_at  TIMESTAMP,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE
);

-- Search Indexes (one workspace can have multiple, plan-limited)
CREATE TABLE IF NOT EXISTS indexes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  document_count  INTEGER NOT NULL DEFAULT 0,
  tsvector_config TEXT NOT NULL DEFAULT 'english',
  created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_name_per_workspace UNIQUE (workspace_id, name)
);

-- Documents with GENERATED tsvector for full-text search
-- search_vector is automatically maintained by PostgreSQL.
-- Content is JSONB; we cast to text for tsvector generation.
CREATE TABLE IF NOT EXISTS documents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  index_id      UUID NOT NULL REFERENCES indexes(id) ON DELETE CASCADE,
  doc_id        TEXT NOT NULL,
  content       JSONB NOT NULL,
  search_vector TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('english', content::text)
  ) STORED,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT uniq_index_doc UNIQUE (index_id, doc_id)
);

-- GIN index on search_vector for fast FTS
CREATE INDEX IF NOT EXISTS documents_search_vector_idx
  ON documents USING GIN (search_vector);

-- Search Logs (analytics)
CREATE TABLE IF NOT EXISTS search_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  index_id      UUID REFERENCES indexes(id) ON DELETE SET NULL,
  query         TEXT NOT NULL,
  results_count INTEGER NOT NULL DEFAULT 0,
  response_ms   INTEGER NOT NULL DEFAULT 0,
  ip_hash       TEXT,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Subscriptions (Stripe billing)
CREATE TABLE IF NOT EXISTS subscriptions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id        UUID NOT NULL UNIQUE REFERENCES workspaces(id) ON DELETE CASCADE,
  stripe_sub_id       TEXT,
  stripe_price_id     TEXT,
  plan                plan NOT NULL DEFAULT 'free',
  status              TEXT NOT NULL DEFAULT 'active',
  current_period_end  TIMESTAMP,
  created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

-- NextAuth Tables (required by @auth/drizzle-adapter)
CREATE TABLE IF NOT EXISTS users (
  id              TEXT PRIMARY KEY,
  name            TEXT,
  email           TEXT NOT NULL UNIQUE,
  email_verified  TIMESTAMP,
  image           TEXT,
  workspace_id    UUID REFERENCES workspaces(id)
);

CREATE TABLE IF NOT EXISTS accounts (
  user_id             TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type                TEXT NOT NULL,
  provider            TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  refresh_token       TEXT,
  access_token        TEXT,
  expires_at          INTEGER,
  token_type          TEXT,
  scope               TEXT,
  id_token            TEXT,
  session_state       TEXT,
  CONSTRAINT accounts_provider_unique UNIQUE (provider, provider_account_id)
);

CREATE TABLE IF NOT EXISTS sessions (
  session_token TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires       TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS verification_tokens (
  identifier TEXT NOT NULL,
  token      TEXT NOT NULL,
  expires    TIMESTAMP NOT NULL,
  CONSTRAINT verification_tokens_pk UNIQUE (identifier, token)
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS api_keys_workspace_idx ON api_keys(workspace_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS indexes_workspace_idx ON indexes(workspace_id);
CREATE INDEX IF NOT EXISTS search_logs_workspace_created_idx ON search_logs(workspace_id, created_at);
CREATE INDEX IF NOT EXISTS search_logs_index_created_idx ON search_logs(index_id, created_at);
