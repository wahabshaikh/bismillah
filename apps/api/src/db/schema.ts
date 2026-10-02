import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// Better Auth core tables. Property names are what Better Auth expects; column
// names are snake_case. Sessions live in KV (see src/auth.ts), so `session` only
// fills up if you turn on `session.storeSessionInDatabase`.

const timestamps = {
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch('subsec') * 1000)`),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch('subsec') * 1000)`)
    .$onUpdate(() => new Date()),
};

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
  image: text("image"),
  ...timestamps,
});

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    token: text("token").notNull().unique(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // Organization plugin: what the user is currently working in.
    activeOrganizationId: text("active_organization_id"),
    activeTeamId: text("active_team_id"),
    ...timestamps,
  },
  (t) => [index("session_user_id_idx").on(t.userId)],
);

export const account = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp_ms" }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp_ms" }),
    scope: text("scope"),
    password: text("password"),
    ...timestamps,
  },
  (t) => [index("account_user_id_idx").on(t.userId)],
);

export const verification = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    ...timestamps,
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

// Better Auth organization plugin (src/auth.ts): organizations, their members and
// pending invitations, plus optional teams inside an organization.

export const organization = sqliteTable("organization", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  logo: text("logo"),
  metadata: text("metadata"),
  createdAt: timestamps.createdAt,
});

export const member = sqliteTable(
  "member",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("member"),
    createdAt: timestamps.createdAt,
  },
  (t) => [
    index("member_organization_id_idx").on(t.organizationId),
    index("member_user_id_idx").on(t.userId),
  ],
);

export const invitation = sqliteTable(
  "invitation",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: text("role"),
    teamId: text("team_id"),
    status: text("status").notNull().default("pending"),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    inviterId: text("inviter_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamps.createdAt,
  },
  (t) => [
    index("invitation_organization_id_idx").on(t.organizationId),
    index("invitation_email_idx").on(t.email),
    // For the hourly cleanup of expired invitations (src/jobs/scheduled.ts).
    index("invitation_expires_at_idx").on(t.expiresAt),
  ],
);

export const team = sqliteTable(
  "team",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    memberCount: integer("member_count").notNull().default(0),
    createdAt: timestamps.createdAt,
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).$onUpdate(() => new Date()),
  },
  (t) => [index("team_organization_id_idx").on(t.organizationId)],
);

export const teamMember = sqliteTable(
  "team_member",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => team.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // Set by Better Auth so a user can't be added to the same team twice.
    membershipKey: text("membership_key").unique(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }),
  },
  (t) => [
    index("team_member_team_id_idx").on(t.teamId),
    index("team_member_user_id_idx").on(t.userId),
  ],
);

/**
 * Metadata for objects stored in the UPLOADS R2 bucket. `processedAt` stays null
 * until the `upload.process` job (src/jobs/process-upload.ts) has checksummed the file.
 */
export const upload = sqliteTable(
  "upload",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    key: text("key").notNull().unique(),
    filename: text("filename").notNull(),
    contentType: text("content_type").notNull(),
    size: integer("size").notNull(),
    sha256: text("sha256"),
    processedAt: integer("processed_at", { mode: "timestamp_ms" }),
    createdAt: timestamps.createdAt,
  },
  (t) => [
    index("upload_user_id_created_at_idx").on(t.userId, t.createdAt),
    // Lets the scheduled sweep find unprocessed uploads without a table scan.
    index("upload_pending_idx").on(t.processedAt, t.createdAt),
  ],
);

/**
 * Whop memberships bought through `POST /v1/billing/checkout`, one row per membership,
 * kept in sync by the webhook in src/routes/webhooks.ts. `id` is Whop's membership ID
 * (`mem_…`); `whopUpdatedAt` is Whop's own `updated_at`, so an older, retried webhook
 * never overwrites a newer state.
 */
export const subscription = sqliteTable(
  "subscription",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    planId: text("plan_id").notNull(),
    productId: text("product_id").notNull(),
    status: text("status").notNull(),
    cancelAtPeriodEnd: integer("cancel_at_period_end", { mode: "boolean" })
      .notNull()
      .default(false),
    currentPeriodEnd: integer("current_period_end", { mode: "timestamp_ms" }),
    manageUrl: text("manage_url"),
    whopUpdatedAt: integer("whop_updated_at", { mode: "timestamp_ms" }).notNull(),
    ...timestamps,
  },
  (t) => [index("subscription_user_id_idx").on(t.userId)],
);

export type User = typeof user.$inferSelect;
export type Upload = typeof upload.$inferSelect;
export type Subscription = typeof subscription.$inferSelect;
export type Organization = typeof organization.$inferSelect;
export type Member = typeof member.$inferSelect;
