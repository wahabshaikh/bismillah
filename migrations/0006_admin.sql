-- P1b: thin super-admin + impersonation (Better Auth `admin` plugin).
-- New file (0001–0005 are already applied — applied migrations are never edited).
--
-- The plugin's schema: nullable `role`/ban fields on `user` and `impersonatedBy`
-- on `session`. Every column is optional and defaults keep existing rows valid.
-- Who counts as a super-admin is still driven by the `ADMIN_EMAILS` allowlist
-- (see `lib/admin.ts`); these columns only let Better Auth's own impersonation
-- endpoints do their bookkeeping.

ALTER TABLE "user" ADD COLUMN "role" TEXT;
ALTER TABLE "user" ADD COLUMN "banned" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "user" ADD COLUMN "banReason" TEXT;
ALTER TABLE "user" ADD COLUMN "banExpires" DATE;

ALTER TABLE "session" ADD COLUMN "impersonatedBy" TEXT;
