-- P1: post-signup onboarding checklist + bring-your-own AI key storage.
-- New file (0001–0003 are already applied — applied migrations are never edited).

-- One row per user. `steps_json` holds the checklist state as a JSON object
-- of { [stepId]: ISO-8601 timestamp }. `completed_at` / `dismissed_at` are set
-- when the whole checklist is finished or the user hides it.
CREATE TABLE IF NOT EXISTS "user_onboarding" (
  "user_id" TEXT NOT NULL PRIMARY KEY REFERENCES "user" ("id") ON DELETE CASCADE,
  "steps_json" TEXT NOT NULL DEFAULT '{}',
  "completed_at" TEXT,
  "dismissed_at" TEXT,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Bring-your-own AI key. Encrypted at rest with AES-GCM (Web Crypto); the
-- app only ever stores ciphertext + a last-4 hint. Workers AI stays the
-- default — this is opt-in per user.
CREATE TABLE IF NOT EXISTS "user_ai_keys" (
  "user_id" TEXT NOT NULL PRIMARY KEY REFERENCES "user" ("id") ON DELETE CASCADE,
  "provider" TEXT NOT NULL DEFAULT 'workers_ai',
  "key_ciphertext" TEXT NOT NULL,
  "key_hint" TEXT NOT NULL DEFAULT '',
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);
