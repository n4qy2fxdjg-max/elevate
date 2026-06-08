-- Migration: background push notifications.
-- Apply before deploying:
--   cd /Users/wahab/ankle-lift
--   npx wrangler d1 execute elevate-db --file=migrations/0002_push.sql --remote

CREATE TABLE IF NOT EXISTS push_pending (
  endpoint TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT 0
);
