-- Canonical fresh-DB schema. For an empty/local D1, apply this whole file.
-- For the live remote DB (which predates LWW), apply the incremental files in
-- migrations/ instead — see migrations/0001_lww_security.sql and 0002_push.sql.

CREATE TABLE IF NOT EXISTS sync_codes (
  code TEXT PRIMARY KEY,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS workout_logs (
  id TEXT PRIMARY KEY,
  sync_code TEXT NOT NULL,
  data TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_ms INTEGER NOT NULL DEFAULT 0,
  deleted INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS workout_plans (
  id TEXT PRIMARY KEY,
  sync_code TEXT NOT NULL,
  data TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_ms INTEGER NOT NULL DEFAULT 0,
  deleted INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id TEXT PRIMARY KEY,
  sync_code TEXT NOT NULL,
  data TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_ms INTEGER NOT NULL DEFAULT 0,
  deleted INTEGER NOT NULL DEFAULT 0
);

-- Fixed-window per-IP rate limiting (best-effort).
CREATE TABLE IF NOT EXISTS rate_limits (
  ip TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL
);

-- Text for the next backgrounded push, fetched by the service worker.
CREATE TABLE IF NOT EXISTS push_pending (
  endpoint TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_logs_sync_code ON workout_logs(sync_code);
CREATE INDEX IF NOT EXISTS idx_plans_sync_code ON workout_plans(sync_code);
CREATE INDEX IF NOT EXISTS idx_activity_sync_code ON activity_logs(sync_code);
