-- P2 polish slice: pre-launch waitlist + display-only usage metering.
-- New file (0001–0006 are already applied — applied migrations are never edited).

-- Public pre-launch email capture. `email` is unique; the API never leaks
-- whether a given address was new or already on the list.
CREATE TABLE IF NOT EXISTS waitlist (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  source TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_waitlist_created_at ON waitlist(created_at DESC);

-- Local usage counters for the display-only Polar metering stub. Rows are
-- summed per calendar month for the `/settings` "Usage this month" card. Halal
-- framing: prepaid / fair metered credits — never interest, BNPL, or
-- subscription pressure. A documented `ingestPolarUsage(...)` hook in
-- `lib/usage.ts` shows where to forward these to Polar Events/Meters later.
CREATE TABLE IF NOT EXISTS usage_events (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  meter TEXT NOT NULL,
  units INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_usage_user_meter ON usage_events(user_id, meter, created_at DESC);
