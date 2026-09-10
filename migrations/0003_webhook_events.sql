-- Polar webhook idempotency ledger.
-- One row per delivered webhook id — the handler skips any id it has already
-- processed, so retried deliveries never double-insert an order.
--
-- New file (not an edit to 0002) because 0002 may already be applied locally;
-- applied migrations are never edited.

CREATE TABLE IF NOT EXISTS "webhook_events" (
  "id" TEXT NOT NULL PRIMARY KEY,       -- webhook-id header (Standard Webhooks)
  "type" TEXT,                          -- event type, e.g. order.paid
  "processed_at" TEXT NOT NULL DEFAULT (datetime('now'))
);
