-- Migration: record-level last-write-wins sync (tombstones + ms timestamps)
-- and rate limiting. Apply to the live D1 BEFORE deploying the new worker:
--   cd /Users/wahab/ankle-lift
--   npx wrangler d1 execute elevate-db --file=migrations/0001_lww_security.sql --remote
-- Existing rows backfill updated_ms/deleted via the column defaults.
-- (workout_logs / workout_plans / activity_logs already exist on the live DB.)

ALTER TABLE workout_logs  ADD COLUMN updated_ms INTEGER NOT NULL DEFAULT 0;
ALTER TABLE workout_logs  ADD COLUMN deleted    INTEGER NOT NULL DEFAULT 0;

ALTER TABLE workout_plans ADD COLUMN updated_ms INTEGER NOT NULL DEFAULT 0;
ALTER TABLE workout_plans ADD COLUMN deleted    INTEGER NOT NULL DEFAULT 0;

ALTER TABLE activity_logs ADD COLUMN updated_ms INTEGER NOT NULL DEFAULT 0;
ALTER TABLE activity_logs ADD COLUMN deleted    INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS rate_limits (
  ip TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL
);
