-- P1 (schema only, behind ENABLE_ORGS): thin multi-tenant tables shaped to
-- extend later with the Better Auth organization plugin. No UI ships with this
-- migration — see `lib/orgs.ts` and the README "Organizations" note.

CREATE TABLE IF NOT EXISTS "organization" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL UNIQUE,
  "logo" TEXT,
  "metadata" TEXT,
  "createdAt" DATE NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "organization_member" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "organizationId" TEXT NOT NULL REFERENCES "organization" ("id") ON DELETE CASCADE,
  "userId" TEXT NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
  "role" TEXT NOT NULL DEFAULT 'member',
  "createdAt" DATE NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "invitation" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "organizationId" TEXT NOT NULL REFERENCES "organization" ("id") ON DELETE CASCADE,
  "email" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'member',
  "status" TEXT NOT NULL DEFAULT 'pending',
  "inviterId" TEXT REFERENCES "user" ("id") ON DELETE SET NULL,
  "expiresAt" DATE,
  "createdAt" DATE NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_org_member_org ON organization_member(organizationId);
CREATE INDEX IF NOT EXISTS idx_org_member_user ON organization_member(userId);
CREATE INDEX IF NOT EXISTS idx_invitation_org ON invitation(organizationId);
CREATE INDEX IF NOT EXISTS idx_invitation_email ON invitation(email);
